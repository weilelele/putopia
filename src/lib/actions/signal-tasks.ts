'use server'

/**
 * Signal Tasks — server actions (admin authoring + future member-facing reads).
 *
 * Authoring flow: createTask → generateCandidates (batch fetch from Cosmo, crop +
 * glitch, upload, store as unselected candidates) → curate (toggle is_selected /
 * set role / order) → publish.
 *
 * New tables aren't in generated types, so queries are cast to `any` (project
 * convention — see admin/layout.tsx).
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { listFrequencies as cosmoListFrequencies, sampleBandAssets } from '@/lib/cosmo'
import type { CosmoFrequency } from '@/lib/cosmo'
import { processImageAsset, uploadProcessed, DEFAULT_CROP } from '@/lib/signal/process'
import type { CropConfig } from '@/lib/signal/process'
import { renderVideoClip, extractAudioClip } from '@/lib/signal/av'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export type SignalTaskType = 'visual_match' | 'visual_odd_one' | 'audio_odd_one'
export type SignalMedia = 'image' | 'video' | 'audio'

export interface SignalTask {
  id: string
  task_date: string
  type: SignalTaskType
  prompt: string | null
  is_published: boolean
  sort_order: number
  created_at: string
}

export interface SignalTaskAsset {
  id: string
  task_id: string
  media: SignalMedia
  source_channel_name: string | null
  source_freq: number | null
  source_band_name: string | null
  source_asset_id: string | null
  source_url: string | null
  processed_url: string | null
  crop_config: CropConfig | Record<string, unknown>
  asset_role: 'main' | 'option'
  is_selected: boolean
  display_order: number
  created_at: string
}

export interface GenerateSource {
  channelId: string
  channelName: string
  freq: number | null
  bandId: string
  bandName: string
  /** 'image' = crop a still; 'video' = crop+glitch a short clip. Ignored for
   *  audio_odd_one tasks (those always pull video → extract audio). */
  media: 'image' | 'video'
  /** how many candidates to pull from THIS source */
  count: number
}

// ─── Cosmo catalog (for the admin picker) ─────────────────────────────────────

export async function getFrequencies(): Promise<CosmoFrequency[]> {
  try {
    return await cosmoListFrequencies()
  } catch (e) {
    console.error('[signal] getFrequencies failed', e)
    return []
  }
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export async function listTasks(): Promise<SignalTask[]> {
  const supabase = createAdminClient() as DB
  const { data, error } = await supabase
    .from('signal_tasks')
    .select('id, task_date, type, prompt, is_published, sort_order, created_at')
    .order('task_date', { ascending: false })
    .order('sort_order', { ascending: true })
  if (error || !data) return []
  return data as SignalTask[]
}

export async function getTask(
  taskId: string,
): Promise<{ task: SignalTask; assets: SignalTaskAsset[] } | null> {
  const supabase = createAdminClient() as DB
  const { data: task } = await supabase
    .from('signal_tasks')
    .select('id, task_date, type, prompt, is_published, sort_order, created_at')
    .eq('id', taskId)
    .single()
  if (!task) return null
  const { data: assets } = await supabase
    .from('signal_task_assets')
    .select('*')
    .eq('task_id', taskId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  return { task: task as SignalTask, assets: (assets ?? []) as SignalTaskAsset[] }
}

export async function createTask(input: {
  type: SignalTaskType
  task_date: string
  prompt?: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient() as DB
  const { data, error } = await supabase
    .from('signal_tasks')
    .insert({
      type: input.type,
      task_date: input.task_date,
      prompt: input.prompt ?? null,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: error?.message }
  return { ok: true, id: data.id as string }
}

export async function setTaskPublished(
  taskId: string,
  published: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  const { error } = await supabase
    .from('signal_tasks')
    .update({ is_published: published })
    .eq('id', taskId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function updateTask(
  taskId: string,
  patch: { prompt?: string; task_date?: string; sort_order?: number },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  const { error } = await supabase.from('signal_tasks').update(patch).eq('id', taskId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function deleteTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  const { error } = await supabase.from('signal_tasks').delete().eq('id', taskId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

// ─── Candidate generation (the core: Cosmo → crop+glitch → candidate pool) ────

/**
 * For each source, sample assets from Cosmo, run the appropriate processing pipeline
 * (image crop+glitch / video crop+glitch clip / audio clip extraction), and store
 * the results as UNSELECTED candidates.
 *
 * Media per source: image → still; video → short glitched clip. For audio_odd_one
 * tasks every source pulls VIDEO and extracts the audio track (skipping the ~25% of
 * clips with no audio).
 */
export async function generateCandidates(
  taskId: string,
  sources: GenerateSource[],
  crop: Partial<CropConfig>,
  opts: { durationSec?: number } = {},
): Promise<{ ok: boolean; created: number; errors: string[] }> {
  const supabase = createAdminClient() as DB
  const cfg: CropConfig = { ...DEFAULT_CROP, ...crop }
  const durationSec = Math.max(1, Math.min(15, opts.durationSec ?? 4))
  const errors: string[] = []
  let created = 0

  // task type decides whether we're in audio mode
  const { data: task } = await supabase
    .from('signal_tasks')
    .select('type')
    .eq('id', taskId)
    .single()
  const audioMode = task?.type === 'audio_odd_one'

  const insertAsset = async (
    src: GenerateSource,
    media: SignalMedia,
    asset: { assetId: string; url: string },
    out: { path: string; url: string; box?: unknown },
  ) => {
    const { error } = await supabase.from('signal_task_assets').insert({
      task_id: taskId,
      media,
      source_channel_id: src.channelId,
      source_channel_name: src.channelName,
      source_freq: src.freq,
      source_band_id: src.bandId,
      source_band_name: src.bandName,
      source_asset_id: asset.assetId,
      source_url: asset.url,
      processed_path: out.path,
      processed_url: out.url,
      crop_config: {
        ...cfg,
        ...(out.box ? { box: out.box } : {}),
        ...(media !== 'image' ? { durationSec } : {}),
      },
      asset_role: 'option',
      is_selected: false,
    })
    if (error) errors.push(`insert: ${error.message}`)
    else created++
  }

  for (const src of sources) {
    const cosmoMedia = audioMode || src.media === 'video' ? 'video' : 'image'
    // audio mode: oversample because ~25% of clips have no audio track
    const sampleN = audioMode ? src.count * 2 : src.count

    let assets
    try {
      assets = await sampleBandAssets(src.channelId, src.bandId, cosmoMedia, sampleN)
    } catch (e) {
      errors.push(`${src.channelName}/${src.bandName}: fetch ${(e as Error).message}`)
      continue
    }
    if (assets.length === 0) {
      errors.push(`${src.channelName}/${src.bandName}: no usable ${cosmoMedia} assets`)
      continue
    }

    let made = 0
    for (const asset of assets) {
      if (audioMode && made >= src.count) break
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      try {
        if (audioMode) {
          const clip = await extractAudioClip(asset.url, { durSec: durationSec })
          if (!clip) continue // no audio track — skip
          const up = await uploadProcessed(taskId, key, clip.buffer, clip.contentType, clip.ext)
          await insertAsset(src, 'audio', asset, up)
          made++
        } else if (src.media === 'video') {
          const clip = await renderVideoClip(asset.url, cfg, { durSec: durationSec })
          const up = await uploadProcessed(taskId, key, clip.buffer, clip.contentType, clip.ext)
          await insertAsset(src, 'video', asset, { ...up, box: clip.box })
          made++
        } else {
          const out = await processImageAsset(taskId, key, asset.url, cfg)
          await insertAsset(src, 'image', asset, out)
          made++
        }
      } catch (e) {
        errors.push(`${src.channelName}/${src.bandName} ${asset.assetId}: ${(e as Error).message}`)
      }
    }
    if (audioMode && made < src.count) {
      errors.push(`${src.channelName}/${src.bandName}: only ${made}/${src.count} clips had audio`)
    }
  }

  return { ok: errors.length === 0, created, errors }
}

// ─── Candidate curation ───────────────────────────────────────────────────────

export async function setAssetSelected(
  assetId: string,
  selected: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  const { error } = await supabase
    .from('signal_task_assets')
    .update({ is_selected: selected })
    .eq('id', assetId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function setAssetRole(
  assetId: string,
  role: 'main' | 'option',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  const { error } = await supabase
    .from('signal_task_assets')
    .update({ asset_role: role })
    .eq('id', assetId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function setAssetOrder(
  assetId: string,
  order: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  const { error } = await supabase
    .from('signal_task_assets')
    .update({ display_order: order })
    .eq('id', assetId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function deleteAsset(assetId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient() as DB
  // best-effort remove the storage object too
  const { data: row } = await supabase
    .from('signal_task_assets')
    .select('processed_path')
    .eq('id', assetId)
    .single()
  if (row?.processed_path) {
    await supabase.storage.from('signal-assets').remove([row.processed_path])
  }
  const { error } = await supabase.from('signal_task_assets').delete().eq('id', assetId)
  return error ? { ok: false, error: error.message } : { ok: true }
}

// ─── Public (member-facing) ───────────────────────────────────────────────────

export interface PublicSignalAsset {
  id: string
  media: SignalMedia
  processed_url: string | null
  asset_role: 'main' | 'option'
  display_order: number
}

export interface PublicSignalTask {
  id: string
  type: SignalTaskType
  prompt: string | null
  assets: PublicSignalAsset[]
  participantCount: number
  /** the asset this user picked, or null if not yet filed */
  mySelection: string | null
  /** counts per asset id — only present once the user has filed (or is architect) */
  distribution: Record<string, number> | null
  /** investigation-thread continuity (if this task is part of a thread). Never
   *  exposes the hidden target. */
  thread: {
    dayIndex: number
    clarity: number
    clarityMax: number
    status: string
    prevParticipants: number | null
  } | null
}

export interface SignalFeed {
  date: string
  role: string | null
  canParticipate: boolean
  tasks: PublicSignalTask[]
}

async function currentUser(): Promise<{ id: string; role: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient() as DB
  const { data } = await admin
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return { id: user.id, role: data?.role ?? 'applicant' }
}

/**
 * Member-facing feed for a day's puzzles. Respects visibility rules:
 *  - everyone sees published tasks, their selected assets, and participant counts;
 *  - only Voyager+ may participate (canParticipate);
 *  - distribution is returned only for tasks the user has already filed (architects
 *    always see it). Source channel/band info is never exposed.
 */
export async function getSignalFeed(date?: string): Promise<SignalFeed> {
  const admin = createAdminClient() as DB
  const me = await currentUser()
  const role = me?.role ?? null
  const isArchitect = role === 'architect'
  const canParticipate = role === 'voyager' || role === 'architect'

  const today = new Date().toISOString().slice(0, 10)
  let targetDate = date
  if (!targetDate) {
    const { data } = await admin
      .from('signal_tasks')
      .select('task_date')
      .eq('is_published', true)
      .lte('task_date', today)
      .order('task_date', { ascending: false })
      .limit(1)
    targetDate = data?.[0]?.task_date ?? today
  }

  const { data: taskRows } = await admin
    .from('signal_tasks')
    .select('id, type, prompt, thread_id, day_index, prev_task_id')
    .eq('is_published', true)
    .eq('task_date', targetDate)
    .order('sort_order', { ascending: true })

  const tasks: PublicSignalTask[] = []
  for (const t of taskRows ?? []) {
    const { data: assetRows } = await admin
      .from('signal_task_assets')
      .select('id, media, processed_url, asset_role, display_order')
      .eq('task_id', t.id)
      .eq('is_selected', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    const { count } = await admin
      .from('signal_responses')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', t.id)

    let mySelection: string | null = null
    if (me) {
      const { data: mine } = await admin
        .from('signal_responses')
        .select('selected_asset_id')
        .eq('task_id', t.id)
        .eq('user_id', me.id)
        .maybeSingle()
      mySelection = mine?.selected_asset_id ?? null
    }

    let distribution: Record<string, number> | null = null
    if (mySelection || isArchitect) {
      const { data: all } = await admin
        .from('signal_responses')
        .select('selected_asset_id')
        .eq('task_id', t.id)
      distribution = {}
      for (const r of all ?? []) {
        const k = r.selected_asset_id as string
        distribution[k] = (distribution[k] ?? 0) + 1
      }
    }

    let thread: PublicSignalTask['thread'] = null
    if (t.thread_id) {
      const { data: th } = await admin
        .from('signal_threads')
        .select('clarity, clarity_max, status')
        .eq('id', t.thread_id)
        .maybeSingle()
      let prevParticipants: number | null = null
      if (t.prev_task_id) {
        const { count: pc } = await admin
          .from('signal_responses')
          .select('id', { count: 'exact', head: true })
          .eq('task_id', t.prev_task_id)
        prevParticipants = pc ?? 0
      }
      if (th) {
        thread = {
          dayIndex: t.day_index ?? 0,
          clarity: th.clarity ?? 0,
          clarityMax: th.clarity_max ?? 4,
          status: th.status ?? 'open',
          prevParticipants,
        }
      }
    }

    tasks.push({
      id: t.id,
      type: t.type,
      prompt: t.prompt,
      assets: (assetRows ?? []) as PublicSignalAsset[],
      participantCount: count ?? 0,
      mySelection,
      distribution,
      thread,
    })
  }

  return { date: targetDate as string, role, canParticipate, tasks }
}

/** File a response (Voyager+ only). One filing per task; re-filing is rejected. */
export async function submitSignalResponse(
  taskId: string,
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser()
  if (!me) return { ok: false, error: '请先登录' }
  if (me.role !== 'voyager' && me.role !== 'architect') {
    return { ok: false, error: '仅 Voyager 可参与填报' }
  }
  const admin = createAdminClient() as DB

  // validate the asset is a live (selected) option of this task, and the task is published
  const { data: asset } = await admin
    .from('signal_task_assets')
    .select('id, is_selected')
    .eq('id', assetId)
    .eq('task_id', taskId)
    .maybeSingle()
  if (!asset || !asset.is_selected) return { ok: false, error: '无效的选项' }
  const { data: task } = await admin
    .from('signal_tasks')
    .select('is_published')
    .eq('id', taskId)
    .maybeSingle()
  if (!task?.is_published) return { ok: false, error: '该题目未发布' }

  const { error } = await admin.from('signal_responses').insert({
    user_id: me.id,
    task_id: taskId,
    selected_asset_id: assetId,
  })
  if (error) {
    if (error.code === '23505') return { ok: false, error: '你已经填报过这道题' }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// ─── Investigation threads: the natural day-to-day evolution ──────────────────

const GLITCH_START = 70
const GLITCH_STEP = 15
const effectiveGlitch = (clarity: number, drift: number) =>
  Math.max(5, Math.min(95, GLITCH_START - clarity * GLITCH_STEP + drift * GLITCH_STEP))
const todayStr = () => new Date().toISOString().slice(0, 10)

export interface ThreadSource {
  channelId: string
  channelName: string
  freq: number | null
  bandId: string
  bandName: string
}

/** Generate ONE thread asset from a source and insert it (selected, optionally the
 *  hidden target). Returns true if an asset was produced. */
async function genThreadAsset(
  taskId: string,
  src: ThreadSource,
  media: SignalMedia,
  cfg: CropConfig,
  isTarget: boolean,
  order: number,
  durationSec: number,
): Promise<boolean> {
  const admin = createAdminClient() as DB
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const cosmoMedia = media === 'image' ? 'image' : 'video'
  const pool = await sampleBandAssets(src.channelId, src.bandId, cosmoMedia, media === 'audio' ? 6 : 3)

  for (const asset of pool) {
    try {
      let up: { path: string; url: string }
      let box: unknown
      if (media === 'audio') {
        const clip = await extractAudioClip(asset.url, { durSec: durationSec })
        if (!clip) continue
        up = await uploadProcessed(taskId, key, clip.buffer, clip.contentType, clip.ext)
      } else if (media === 'video') {
        const clip = await renderVideoClip(asset.url, cfg, { durSec: durationSec })
        up = await uploadProcessed(taskId, key, clip.buffer, clip.contentType, clip.ext)
        box = clip.box
      } else {
        const out = await processImageAsset(taskId, key, asset.url, cfg)
        up = { path: out.path, url: out.url }
        box = out.box
      }
      await admin.from('signal_task_assets').insert({
        task_id: taskId,
        media,
        source_channel_id: src.channelId,
        source_channel_name: src.channelName,
        source_freq: src.freq,
        source_band_id: src.bandId,
        source_band_name: src.bandName,
        source_asset_id: asset.assetId,
        source_url: asset.url,
        processed_path: up.path,
        processed_url: up.url,
        crop_config: { ...cfg, ...(box ? { box } : {}), ...(media !== 'image' ? { durationSec } : {}) },
        asset_role: 'option',
        is_target: isTarget,
        is_selected: true,
        display_order: order,
      })
      return true
    } catch {
      continue
    }
  }
  return false
}

/** Build one day's assets for a thread: (optionCount-1) from the group source + 1
 *  from the hidden target source, in randomised display order. */
async function generateThreadDay(
  taskId: string,
  thread: DB,
  glitch: number,
): Promise<{ made: number; targetPlaced: boolean }> {
  const media: SignalMedia = thread.type === 'audio_odd_one' ? 'audio' : 'image'
  const cfg: CropConfig = { ...DEFAULT_CROP, glitchIntensity: glitch }
  const group: ThreadSource = {
    channelId: thread.group_channel_id, channelName: thread.group_channel_name,
    freq: thread.group_freq, bandId: thread.group_band_id, bandName: thread.group_band_name,
  }
  const target: ThreadSource = {
    channelId: thread.target_channel_id, channelName: thread.target_channel_name,
    freq: thread.target_freq, bandId: thread.target_band_id, bandName: thread.target_band_name,
  }
  const n = thread.option_count ?? 4
  const targetSlot = Math.floor(Math.random() * n)
  let made = 0
  let targetPlaced = false
  for (let i = 0; i < n; i++) {
    const isTarget = i === targetSlot
    const ok = await genThreadAsset(taskId, isTarget ? target : group, media, cfg, isTarget, i, 4)
    if (ok) { made++; if (isTarget) targetPlaced = true }
  }
  return { made, targetPlaced }
}

export interface SignalThreadRow {
  id: string
  title: string | null
  type: SignalTaskType
  status: string
  clarity: number
  clarity_max: number
  drift: number
  group_channel_name: string | null
  target_channel_name: string | null
  target_freq: number | null
  world_id: string | null
  day_count: number
}

export async function listThreads(): Promise<SignalThreadRow[]> {
  const admin = createAdminClient() as DB
  const { data } = await admin
    .from('signal_threads')
    .select('id, title, type, status, clarity, clarity_max, drift, group_channel_name, target_channel_name, target_freq, world_id')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as SignalThreadRow[]
  // attach day_count
  for (const r of rows) {
    const { count } = await admin
      .from('signal_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', r.id)
    r.day_count = count ?? 0
  }
  return rows
}

/** Create an investigation thread + its day-0 task, and generate day-0 assets. */
export async function createThread(input: {
  type: SignalTaskType
  prompt?: string
  group: ThreadSource
  target: ThreadSource
  optionCount?: number
  clarityMax?: number
}): Promise<{ ok: boolean; threadId?: string; taskId?: string; made?: number; error?: string }> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: '仅 Architect 可创建调查线' }
  const admin = createAdminClient() as DB

  const { data: thread, error: tErr } = await admin
    .from('signal_threads')
    .insert({
      type: input.type,
      title: `${input.group.channelName} ↔ ${input.target.channelName}`,
      group_channel_id: input.group.channelId, group_channel_name: input.group.channelName,
      group_freq: input.group.freq, group_band_id: input.group.bandId, group_band_name: input.group.bandName,
      target_channel_id: input.target.channelId, target_channel_name: input.target.channelName,
      target_freq: input.target.freq, target_band_id: input.target.bandId, target_band_name: input.target.bandName,
      option_count: input.optionCount ?? 4,
      clarity_max: input.clarityMax ?? 4,
      created_by: me.id,
    })
    .select('*')
    .single()
  if (tErr || !thread) return { ok: false, error: tErr?.message }

  const { data: task, error: kErr } = await admin
    .from('signal_tasks')
    .insert({
      type: input.type,
      task_date: todayStr(),
      prompt: input.prompt ?? null,
      is_published: true,
      thread_id: thread.id,
      day_index: 0,
    })
    .select('id')
    .single()
  if (kErr || !task) return { ok: false, error: kErr?.message }

  const { made } = await generateThreadDay(task.id, thread, effectiveGlitch(0, 0))
  return { ok: true, threadId: thread.id, taskId: task.id, made }
}

/** Best-effort: when a thread locks, surface the discovered channel as a world. */
async function tieWorld(thread: DB): Promise<string | null> {
  const admin = createAdminClient() as DB
  const id = `sig-${String(thread.id).slice(0, 8)}`
  const name = thread.target_channel_name || '未知信号'
  try {
    const { error } = await admin.from('worlds').insert({
      id,
      name,
      name_en: name,
      discoverer_name: 'Signal Collective',
      discovery_date: todayStr(),
      gradient_from: '#FF6B35',
      gradient_to: '#0A0E27',
      description: `经由每日信号众包研判锁定的频率 ${thread.target_freq ?? ''} ${name}。`,
    })
    if (error && error.code !== '23505') return null
    // try to set lifecycle (column may not exist in older schema — ignore failure)
    await admin.from('worlds').update({ lifecycle_state: 'picked' }).eq('id', id)
    return id
  } catch {
    return null
  }
}

export interface AdvanceResult {
  ok: boolean
  error?: string
  converged?: boolean
  majorityAssetId?: string | null
  participantCount?: number
  clarity?: number
  drift?: number
  status?: string
  nextTaskId?: string
  worldId?: string | null
}

/** Settle the latest day of a thread and roll it forward (manual Phase-A trigger).
 *  Crowd majority == hidden target → converge (clearer); else → diverge (noisier). */
export async function advanceThread(threadId: string): Promise<AdvanceResult> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: '仅 Architect 可推进调查线' }
  const admin = createAdminClient() as DB

  const { data: thread } = await admin.from('signal_threads').select('*').eq('id', threadId).single()
  if (!thread) return { ok: false, error: '调查线不存在' }
  if (thread.status !== 'open') return { ok: false, error: `调查线已${thread.status === 'locked' ? '锁定' : '失联'}` }

  const { data: latest } = await admin
    .from('signal_tasks')
    .select('id, day_index')
    .eq('thread_id', threadId)
    .order('day_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latest) return { ok: false, error: '该调查线没有题目' }

  const { data: assets } = await admin
    .from('signal_task_assets')
    .select('id, is_target')
    .eq('task_id', latest.id)
  const targetAsset = (assets ?? []).find((a: DB) => a.is_target)

  const { data: responses } = await admin
    .from('signal_responses')
    .select('selected_asset_id')
    .eq('task_id', latest.id)
  const tally: Record<string, number> = {}
  for (const r of responses ?? []) tally[r.selected_asset_id] = (tally[r.selected_asset_id] ?? 0) + 1
  const participantCount = (responses ?? []).length
  let majorityAssetId: string | null = null
  let max = -1
  for (const [k, v] of Object.entries(tally)) if (v > max) { max = v; majorityAssetId = k }

  const converged = !!(majorityAssetId && targetAsset && majorityAssetId === targetAsset.id)
  const clarity = thread.clarity + (converged ? 1 : 0)
  const drift = thread.drift + (converged ? 0 : 1)
  let status: string = 'open'
  if (clarity >= thread.clarity_max) status = 'locked'
  else if (drift >= thread.drift_max) status = 'lost'

  await admin.from('signal_threads').update({ clarity, drift, status }).eq('id', threadId)

  const result: AdvanceResult = { ok: true, converged, majorityAssetId, participantCount, clarity, drift, status }

  if (status === 'open') {
    const { data: nextTask } = await admin
      .from('signal_tasks')
      .insert({
        type: thread.type,
        task_date: todayStr(),
        prompt: null,
        is_published: true,
        thread_id: threadId,
        day_index: latest.day_index + 1,
        prev_task_id: latest.id,
      })
      .select('id')
      .single()
    if (nextTask) {
      await generateThreadDay(nextTask.id, thread, effectiveGlitch(clarity, drift))
      result.nextTaskId = nextTask.id
    }
  } else if (status === 'locked') {
    const worldId = await tieWorld(thread)
    if (worldId) await admin.from('signal_threads').update({ world_id: worldId }).eq('id', threadId)
    result.worldId = worldId
  }

  return result
}
