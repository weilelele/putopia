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
import { listFrequencies as cosmoListFrequencies, sampleBandAssets, getBandAssets as cosmoGetBandAssets } from '@/lib/cosmo'
import type { CosmoFrequency } from '@/lib/cosmo'
import { processImageAsset, uploadProcessed, DEFAULT_CROP } from '@/lib/signal/process'
import type { CropConfig } from '@/lib/signal/process'
import type { WorldVoteScope, WorldLifecycle, WorldStage } from '@/types/database'
import { worldStage } from '@/types/database'
import { renderVideoClip, extractAudioClip } from '@/lib/signal/av'
import { revealAt as computeRevealAt, isRevealed, DEFAULT_REVEAL_INTERVAL_HOURS } from '@/lib/signal/reveal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const todayStr = () => new Date().toISOString().slice(0, 10)

export type SignalTaskType = 'visual_match' | 'visual_odd_one' | 'audio_odd_one' | 'audio_match'
export type SignalMedia = 'image' | 'video' | 'audio'

export interface SignalTask {
  id: string
  task_date: string
  type: SignalTaskType
  prompt: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  day_index: number | null
  thread_id: string | null
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
  /** Animated WebP derived from the MP4 — used by the frontend for auto-looping
   *  display. Null for image/audio assets and older video rows. */
  display_url: string | null
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
    .select('id, task_date, type, prompt, is_published, sort_order, created_at, day_index, thread_id')
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
    .select('id, task_date, type, prompt, is_published, sort_order, created_at, day_index, thread_id')
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
  // Publishing stamps published_at (the 24h recall reference) and re-arms the
  // recall guard; unpublishing clears both.
  const patch = published
    ? { is_published: true, published_at: new Date().toISOString(), recall_sent_at: null }
    : { is_published: false, published_at: null, recall_sent_at: null }
  const { error } = await supabase
    .from('signal_tasks')
    .update(patch)
    .eq('id', taskId)
  if (error) return { ok: false, error: error.message }

  // Schedule anchor: the whole reveal timeline follows the first published day.
  // Set the thread anchor on the first publish; clear it once no published days
  // remain (so re-publishing later restarts the clock cleanly).
  try {
    const { data: t } = await supabase.from('signal_tasks').select('thread_id').eq('id', taskId).maybeSingle()
    const threadId: string | null = t?.thread_id ?? null
    if (threadId) {
      if (published) {
        const { data: thread } = await supabase
          .from('signal_threads')
          .select('reveal_anchor_at')
          .eq('id', threadId)
          .maybeSingle()
        if (!thread?.reveal_anchor_at) {
          await supabase.from('signal_threads').update({ reveal_anchor_at: new Date().toISOString() }).eq('id', threadId)
        }
      } else {
        const { count } = await supabase
          .from('signal_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', threadId)
          .eq('is_published', true)
        if (!count) {
          await supabase.from('signal_threads').update({ reveal_anchor_at: null }).eq('id', threadId)
        }
      }
    }
  } catch { /* anchor maintenance is best-effort */ }

  // When publishing a task that belongs to an investigation, post to the feed
  if (published) {
    try {
      const { data: task } = await supabase
        .from('signal_tasks')
        .select('thread_id, day_index, prompt, type')
        .eq('id', taskId)
        .maybeSingle()
      if (task?.thread_id) {
        const { data: thread } = await supabase
          .from('signal_threads')
          .select('title, world_id')
          .eq('id', task.thread_id)
          .maybeSingle()
        let worldName: string | null = thread?.title ?? null
        if (thread?.world_id) {
          const { data: world } = await supabase
            .from('worlds')
            .select('name')
            .eq('id', thread.world_id)
            .maybeSingle()
          worldName = world?.name ?? worldName
        }
        if (worldName) {
          const dayNum = (task.day_index ?? 0) + 1
          await postSignalStory(
            `signal-day-${taskId.slice(0, 8)}`,
            `Day ${dayNum} · ${worldName}`,
            task.prompt || `New signals available for Day ${dayNum} of "${worldName}".`,
            `**${worldName}** — Day ${dayNum} signals are now live.\n\nHead to Signal Dispatch and cast your vote.`,
          )
        }
        // First time a world's signals go live: email the original proposer
        // ("your world really exists"). Idempotent — no-ops after the first send.
        if (thread?.world_id) {
          const { maybeSendWorldConfirmedEmail } = await import('@/lib/signal/world-confirmed-email')
          await maybeSendWorldConfirmedEmail(thread.world_id)
        }
      }
    } catch { /* feed post + proposer email are best-effort */ }
  }

  return { ok: true }
}

export async function updateTask(
  taskId: string,
  patch: { prompt?: string; task_date?: string; sort_order?: number; type?: SignalTaskType },
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

type SourceMeta = Pick<GenerateSource, 'channelId' | 'channelName' | 'freq' | 'bandId' | 'bandName' | 'media'>

/**
 * Process ONE Cosmo asset through the right pipeline (image crop+glitch / video
 * crop+glitch clip / audio clip extraction), upload it, and insert it as an
 * UNSELECTED candidate. Shared by random generation and precise Forge pick.
 * Returns { created:false } with no error when an audio source has no track.
 */
async function processAndInsertCandidate(
  supabase: DB,
  taskId: string,
  cfg: CropConfig,
  durationSec: number,
  audioMode: boolean,
  src: SourceMeta,
  asset: { assetId: string; url: string },
): Promise<{ created: boolean; error?: string }> {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const insert = async (
    media: SignalMedia,
    out: { path: string; url: string; box?: unknown },
    displayOut?: { url: string } | null,
  ): Promise<string | null> => {
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
      display_url: displayOut?.url ?? null,
      crop_config: {
        ...cfg,
        ...(out.box ? { box: out.box } : {}),
        ...(media !== 'image' ? { durationSec } : {}),
      },
      asset_role: 'option',
      is_selected: false,
    })
    return error ? error.message : null
  }

  try {
    if (audioMode) {
      const clip = await extractAudioClip(asset.url, { durSec: durationSec })
      if (!clip) return { created: false } // no audio track — skip
      const up = await uploadProcessed(taskId, key, clip.buffer, clip.contentType, clip.ext)
      const e = await insert('audio', up, null)
      return e ? { created: false, error: e } : { created: true }
    } else if (src.media === 'video') {
      const clip = await renderVideoClip(asset.url, cfg, { durSec: durationSec })
      const up = await uploadProcessed(taskId, key, clip.buffer, clip.contentType, clip.ext)
      // Upload animated WebP for frontend auto-loop display (best-effort)
      let dispUp: { url: string } | null = null
      if (clip.displayBuffer) {
        dispUp = await uploadProcessed(taskId, `${key}-d`, clip.displayBuffer, clip.displayContentType, clip.displayExt)
      }
      const e = await insert('video', { ...up, box: clip.box }, dispUp)
      return e ? { created: false, error: e } : { created: true }
    } else {
      const out = await processImageAsset(taskId, key, asset.url, cfg)
      const e = await insert('image', out, null)
      return e ? { created: false, error: e } : { created: true }
    }
  } catch (e) {
    return { created: false, error: (e as Error).message }
  }
}

/**
 * Random Forge import: for each source, sample assets from Cosmo, process them,
 * and store the results as UNSELECTED candidates.
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
  const audioMode = task?.type === 'audio_odd_one' || task?.type === 'audio_match'

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
      const r = await processAndInsertCandidate(supabase, taskId, cfg, durationSec, audioMode, src, asset)
      if (r.error) errors.push(`${src.channelName}/${src.bandName} ${asset.assetId}: ${r.error}`)
      if (r.created) { created++; made++ }
    }
    if (audioMode && made < src.count) {
      errors.push(`${src.channelName}/${src.bandName}: only ${made}/${src.count} clips had audio`)
    }
  }

  return { ok: errors.length === 0, created, errors }
}

/** Browse a Cosmo band's assets for the precise-pick UI (doc 5.2 precise pick). */
export async function listBandAssets(
  channelId: string,
  bandId: string,
  media: 'image' | 'video',
): Promise<{ assetId: string; url: string; prompt: string | null }[]> {
  try {
    const assets = await cosmoGetBandAssets(channelId, bandId, media)
    return assets.map((a) => ({ assetId: a.assetId, url: a.url, prompt: a.prompt ?? null }))
  } catch (e) {
    console.error('[signal] listBandAssets failed', e)
    return []
  }
}

/**
 * Precise Forge import (doc 5.2 precise pick): process a HAND-PICKED set of Cosmo asset
 * ids from one band through the pipeline and store them as candidates.
 */
export async function pullForgeAssets(
  taskId: string,
  src: SourceMeta,
  assetIds: string[],
  crop: Partial<CropConfig>,
  opts: { durationSec?: number } = {},
): Promise<{ ok: boolean; created: number; errors: string[] }> {
  const supabase = createAdminClient() as DB
  const cfg: CropConfig = { ...DEFAULT_CROP, ...crop }
  const durationSec = Math.max(1, Math.min(15, opts.durationSec ?? 4))
  const errors: string[] = []
  let created = 0

  const { data: task } = await supabase.from('signal_tasks').select('type').eq('id', taskId).single()
  const audioMode = task?.type === 'audio_odd_one' || task?.type === 'audio_match'
  const cosmoMedia = audioMode || src.media === 'video' ? 'video' : 'image'

  let all
  try {
    all = await cosmoGetBandAssets(src.channelId, src.bandId, cosmoMedia)
  } catch (e) {
    return { ok: false, created: 0, errors: [`fetch: ${(e as Error).message}`] }
  }
  const want = new Set(assetIds)
  const picked = all.filter((a) => want.has(a.assetId))

  for (const asset of picked) {
    const r = await processAndInsertCandidate(supabase, taskId, cfg, durationSec, audioMode, src, asset)
    if (r.error) errors.push(`${asset.assetId}: ${r.error}`)
    if (r.created) created++
    else if (!r.error && audioMode) errors.push(`${asset.assetId}: no audio track`)
  }

  return { ok: errors.length === 0, created, errors }
}

/**
 * Store a Forge video candidate processed in the BROWSER (ffmpeg.wasm): the
 * client sends the finished animated WebP/GIF; we upload it and insert the row.
 * Used because Vercel serverless can't run the ffmpeg binary (Next.js #53791).
 */
export async function storeForgeVideoCandidate(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: 'Architect role required' }
  const supabase = createAdminClient() as DB

  const taskId = String(form.get('taskId') || '')
  const file = form.get('display')
  if (!taskId || !(file instanceof File)) return { ok: false, error: 'missing taskId/display' }
  const ext = String(form.get('ext') || 'webp')
  const mime = String(form.get('mime') || 'image/webp')
  let meta: Record<string, unknown> = {}
  try { meta = JSON.parse(String(form.get('source') || '{}')) } catch { /* ignore */ }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let up: { path: string; url: string }
  try {
    up = await uploadProcessed(taskId, key, buffer, mime, ext)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  const { error } = await supabase.from('signal_task_assets').insert({
    task_id: taskId,
    media: 'video',
    source_channel_id: meta.channelId ?? null,
    source_channel_name: meta.channelName ?? null,
    source_freq: meta.freq ?? null,
    source_band_id: meta.bandId ?? null,
    source_band_name: meta.bandName ?? null,
    source_asset_id: meta.assetId ?? null,
    source_url: meta.url ?? null,
    processed_path: up.path,
    processed_url: up.url,        // animated WebP/GIF (no separate mp4 in the wasm path)
    display_url: up.url,
    crop_config: meta.crop ?? {},
    asset_role: 'option',
    is_selected: false,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
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
  /** Animated WebP — prefer this over processed_url for video assets on the frontend. */
  display_url: string | null
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
      .select('id, media, processed_url, display_url, asset_role, display_order')
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

/**
 * Owner voting permission (doc 2.1). Architect can always vote; otherwise:
 *   self   → only the world's owner (discoverer)
 *   voters → Voyager members only
 *   all    → any logged-in registered user (applicants included)
 */
function eligibleToVote(
  role: string | null,
  userId: string | null,
  voteScope: WorldVoteScope,
  ownerId: string | null,
): boolean {
  if (!role || !userId) return false
  if (role === 'architect') return true
  if (voteScope === 'self') return userId === ownerId
  if (voteScope === 'voters') return role === 'voyager'
  return true // 'all'
}

/** Human-readable reason a viewer can't vote, for the locked-card label. */
function lockReason(voteScope: WorldVoteScope, loggedIn: boolean): string {
  if (!loggedIn) return 'Log in to respond'
  if (voteScope === 'self') return 'Private — owner only'
  if (voteScope === 'voters') return 'Voyagers only'
  return 'Log in to respond'
}

/** File a response. Eligibility is per-world (doc 2.1). One filing per task. */
export async function submitSignalResponse(
  taskId: string,
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser()
  if (!me) return { ok: false, error: 'Please log in first' }
  const admin = createAdminClient() as DB

  // resolve the owning world's vote scope + owner via the task's thread
  const { data: task } = await admin
    .from('signal_tasks')
    .select('is_published, thread_id')
    .eq('id', taskId)
    .maybeSingle()
  if (!task?.is_published) return { ok: false, error: 'Task is not published' }

  let voteScope: WorldVoteScope = 'all'
  let ownerId: string | null = null
  if (task.thread_id) {
    const { data: thread } = await admin.from('signal_threads').select('world_id').eq('id', task.thread_id).maybeSingle()
    if (thread?.world_id) {
      const { data: world } = await admin.from('worlds').select('vote_scope, discoverer_id').eq('id', thread.world_id).maybeSingle()
      voteScope = (world?.vote_scope as WorldVoteScope) ?? 'all'
      ownerId = world?.discoverer_id ?? null
    }
  }
  if (!eligibleToVote(me.role, me.id, voteScope, ownerId)) {
    return { ok: false, error: 'You are not eligible to vote on this world' }
  }

  // validate the asset is a live (selected) option of this task
  const { data: asset } = await admin
    .from('signal_task_assets')
    .select('id, is_selected')
    .eq('id', assetId)
    .eq('task_id', taskId)
    .maybeSingle()
  if (!asset || !asset.is_selected) return { ok: false, error: 'Invalid option' }

  const { error } = await admin.from('signal_responses').insert({
    user_id: me.id,
    task_id: taskId,
    selected_asset_id: assetId,
  })
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'You have already responded to this task' }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// ─── World Building: Signal Tuning (manual authoring, world-centric) ──────────
//
// An "Investigation" is a signal_thread bound to a World. It represents that
// World's Signal Tuning phase. Title / discoverer always come from the World;
// the thread no longer carries its own title. Authoring is fully manual — admins
// add each day's puzzle by hand (no auto-generation, no auto-advance).

export interface PublicInvestigation {
  id: string                      // thread id
  worldId: string | null
  title: string                   // world name
  discovererName: string | null
  type: SignalTaskType
  voteScope: WorldVoteScope
  canParticipate: boolean         // this viewer may vote on THIS world (doc 2.1)
  lockReason: string | null       // why voting is locked, if it is
  days: {
    dayIndex: number
    task: PublicSignalTask
    revealAt: string | null   // when this day surfaces (ISO); null if schedule unstarted
    revealed: boolean         // already surfaced as of now (always true for public viewers)
  }[]
}

export interface InvestigationFeedData {
  investigations: PublicInvestigation[]
  role: string | null
  loggedIn: boolean
}

export interface InvestigationSummary {
  id: string                      // thread id
  worldId: string | null
  title: string                   // world name (fallback '(untitled)')
  type: SignalTaskType
  dayCount: number
  createdAt: string
}

/** A proposed world eligible to be promoted into Signal Tuning. */
export interface TunableWorld {
  id: string
  name: string
  description: string | null
}

/** Post a system-authored story to the community feed (best-effort). */
async function postSignalStory(id: string, title: string, excerpt: string, content: string) {
  const admin = createAdminClient() as DB
  try {
    await admin.from('stories').insert({
      id,
      title,
      author_id: null,
      author_name: 'The Organization',
      date: todayStr(),
      tags: ['signal', 'investigation'],
      excerpt,
      content,
      youtube_id: null,
      is_published: true,
    })
  } catch (e) {
    console.warn('[signal] postSignalStory non-fatal:', (e as Error).message)
  }
}

/** Post the "now tuning" feed story for a world entering Signal Tuning. */
async function postTuningStory(threadId: string, worldName: string) {
  await postSignalStory(
    `signal-inv-${threadId.slice(0, 8)}`,
    `Now Tuning: ${worldName}`,
    `The signal for "${worldName}" is being tuned. Help us bring it into focus.`,
    `**${worldName}** has entered Signal Tuning.\n\nHead to Signal Dispatch to help decipher its signal.`,
  )
}

/** Worlds eligible for promotion: in 'proposed' (Raw Imagination) stage and not
 *  already attached to a tuning thread. */
export async function listTunableWorlds(): Promise<TunableWorld[]> {
  const admin = createAdminClient() as DB
  const { data: threads } = await admin.from('signal_threads').select('world_id')
  const taken = new Set(((threads ?? []) as { world_id: string | null }[]).map((t) => t.world_id).filter(Boolean))
  const { data } = await admin
    .from('worlds')
    .select('id, name, description')
    .eq('lifecycle_state', 'proposed')
    .order('submitted_at', { ascending: false })
  return ((data ?? []) as TunableWorld[]).filter((w) => !taken.has(w.id))
}

/** Promote an existing proposed world into Signal Tuning: create its dispatch
 *  thread, set the owner vote scope, and advance the world to the tuning stage. */
export async function promoteWorldToTuning(input: {
  worldId: string
  voteScope?: WorldVoteScope
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: 'Architect role required' }
  const admin = createAdminClient() as DB

  const { data: world } = await admin.from('worlds').select('id, name').eq('id', input.worldId).maybeSingle()
  if (!world) return { ok: false, error: 'World not found' }

  const { data: existing } = await admin.from('signal_threads').select('id').eq('world_id', input.worldId).maybeSingle()
  if (existing) return { ok: false, error: 'This world is already in Signal Tuning' }

  // thread.type is only a default template for new days — each day picks its own.
  const { data, error } = await admin
    .from('signal_threads')
    .insert({ type: 'visual_odd_one', world_id: input.worldId, created_by: me.id })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: error?.message }

  await admin.from('worlds').update({
    lifecycle_state: 'syncing',
    vote_scope: input.voteScope ?? 'all',
  }).eq('id', input.worldId)
  await postTuningStory(data.id, world.name)

  return { ok: true, id: data.id }
}

/** Seed a brand-new world directly into Signal Tuning — the admin authoring path
 *  when there's no user-proposed world to promote. */
export async function createWorldForTuning(input: {
  name: string
  description?: string
  voteScope?: WorldVoteScope
}): Promise<{ ok: boolean; id?: string; worldId?: string; error?: string }> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: 'Architect role required' }
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'World name is required' }
  const admin = createAdminClient() as DB

  const { data: profile } = await admin.from('voyager_profiles').select('display_name').eq('id', me.id).maybeSingle()
  const discovererName = profile?.display_name?.trim() || 'The Organization'
  const worldId = `WB-${Date.now().toString(36).toUpperCase()}`

  const { error: wErr } = await admin.from('worlds').insert({
    id: worldId,
    name,
    name_en: name,
    discoverer_id: me.id,
    discoverer_name: discovererName,
    discovery_date: todayStr(),
    gradient_from: '#1a1a2e',
    gradient_to: '#16213e',
    image_path: null,
    description: input.description ?? '',
    is_verified: true,
    lifecycle_state: 'syncing',
    vote_scope: input.voteScope ?? 'all',
    submitted_by: me.id,
    submitted_at: new Date().toISOString(),
  })
  if (wErr) return { ok: false, error: wErr.message }

  const { data, error } = await admin
    .from('signal_threads')
    .insert({ type: 'visual_odd_one', world_id: worldId, created_by: me.id })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: error?.message }

  await postTuningStory(data.id, name)

  return { ok: true, id: data.id, worldId }
}

export interface InvestigationConfig {
  threadId: string
  worldId: string | null
  title: string
  visionText: string | null
  voteScope: WorldVoteScope
  revealAnchorAt: string | null      // schedule origin (set when day 0 publishes)
  revealIntervalHours: number        // cadence between day reveals
}

/** Full config for one investigation — world identity + owner vote scope.
 *  (Type is now per-day, not per-world; media phase is retired.) */
export async function getInvestigationConfig(threadId: string): Promise<InvestigationConfig | null> {
  const admin = createAdminClient() as DB
  const { data: thread } = await admin
    .from('signal_threads')
    .select('id, title, world_id, reveal_anchor_at, reveal_interval_hours')
    .eq('id', threadId)
    .maybeSingle()
  if (!thread) return null

  let title = thread.title ?? '(untitled)'
  let visionText: string | null = null
  let voteScope: WorldVoteScope = 'all'
  if (thread.world_id) {
    const { data: world } = await admin
      .from('worlds')
      .select('name, description, vote_scope')
      .eq('id', thread.world_id)
      .maybeSingle()
    if (world) {
      title = world.name
      visionText = world.description ?? null
      voteScope = (world.vote_scope as WorldVoteScope) ?? 'all'
    }
  }

  return {
    threadId: thread.id,
    worldId: thread.world_id,
    title,
    visionText,
    voteScope,
    revealAnchorAt: thread.reveal_anchor_at ?? null,
    revealIntervalHours: thread.reveal_interval_hours ?? DEFAULT_REVEAL_INTERVAL_HOURS,
  }
}

/** Update the owner vote scope (on the world) and/or the reveal schedule (on the
 *  thread). `revealIntervalHours` tunes the cadence; `revealAnchorAt` lets the
 *  architect start/reset the timeline (null = not started). */
export async function updateInvestigationConfig(
  threadId: string,
  patch: { voteScope?: WorldVoteScope; revealIntervalHours?: number; revealAnchorAt?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: 'Architect role required' }
  const admin = createAdminClient() as DB

  if (patch.voteScope) {
    const { data: thread } = await admin.from('signal_threads').select('world_id').eq('id', threadId).maybeSingle()
    if (thread?.world_id) {
      const { error } = await admin.from('worlds').update({ vote_scope: patch.voteScope }).eq('id', thread.world_id)
      if (error) return { ok: false, error: error.message }
    }
  }

  const threadPatch: Record<string, unknown> = {}
  if (patch.revealIntervalHours != null) {
    threadPatch.reveal_interval_hours = Math.max(1, Math.round(patch.revealIntervalHours))
  }
  if (patch.revealAnchorAt !== undefined) {
    threadPatch.reveal_anchor_at = patch.revealAnchorAt // ISO string or null to reset
  }
  if (Object.keys(threadPatch).length) {
    const { error } = await admin.from('signal_threads').update(threadPatch).eq('id', threadId)
    if (error) return { ok: false, error: error.message }
  }
  return { ok: true }
}

const VOTE_SCOPE_VALUES: WorldVoteScope[] = ['self', 'voters', 'all']

/** Owner-facing: let the world's originator (or an architect) choose who may
 *  vote on their world's signals, from the world detail page. Defaults to 'all'. */
export async function setWorldVoteScope(
  worldId: string,
  voteScope: WorldVoteScope,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser()
  if (!me) return { ok: false, error: 'Login required' }
  if (!VOTE_SCOPE_VALUES.includes(voteScope)) return { ok: false, error: 'Invalid scope' }
  const admin = createAdminClient() as DB

  const { data: world } = await admin
    .from('worlds')
    .select('submitted_by, discoverer_id')
    .eq('id', worldId)
    .maybeSingle()
  if (!world) return { ok: false, error: 'World not found' }

  const isOwner = me.id === world.submitted_by || me.id === world.discoverer_id
  if (!isOwner && me.role !== 'architect') return { ok: false, error: 'Not allowed' }

  const { error } = await admin.from('worlds').update({ vote_scope: voteScope }).eq('id', worldId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Add the next day to an investigation — creates a draft task (day_index auto-increments). */
export async function addDayToInvestigation(
  threadId: string,
  type?: SignalTaskType,
): Promise<{ ok: boolean; id?: string; dayIndex?: number; error?: string }> {
  const me = await currentUser()
  if (!me || me.role !== 'architect') return { ok: false, error: 'Architect role required' }
  const admin = createAdminClient() as DB

  const { data: thread } = await admin
    .from('signal_threads')
    .select('type')
    .eq('id', threadId)
    .single()
  if (!thread) return { ok: false, error: 'Investigation not found' }

  // Carry the latest day's type forward (continuity); admin can change it after.
  const { data: latest } = await admin
    .from('signal_tasks')
    .select('day_index, type')
    .eq('thread_id', threadId)
    .order('day_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextDayIndex = (latest?.day_index ?? -1) + 1
  const nextType = type ?? latest?.type ?? thread.type ?? 'visual_odd_one'

  const { data, error } = await admin
    .from('signal_tasks')
    .insert({
      type: nextType,
      task_date: todayStr(),
      is_published: false,
      thread_id: threadId,
      day_index: nextDayIndex,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message }
  return { ok: true, id: data.id, dayIndex: nextDayIndex }
}

/** List all investigations (threads) with their world title, newest first. */
export async function listInvestigations(): Promise<InvestigationSummary[]> {
  const admin = createAdminClient() as DB
  const { data } = await admin
    .from('signal_threads')
    .select('id, title, type, created_at, world_id')
    .order('created_at', { ascending: false })
  const threads = (data ?? []) as { id: string; title: string | null; type: SignalTaskType; created_at: string; world_id: string | null }[]

  const nameById = await worldNameMap(admin, threads.map((t) => t.world_id))

  const rows: InvestigationSummary[] = []
  for (const t of threads) {
    const { count } = await admin
      .from('signal_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', t.id)
    rows.push({
      id: t.id,
      worldId: t.world_id,
      title: (t.world_id && nameById.get(t.world_id)) || t.title || '(untitled)',
      type: t.type,
      dayCount: count ?? 0,
      createdAt: t.created_at,
    })
  }
  return rows
}

/** Resolve a set of world ids → { id: { name, discoverer_name } }. */
interface WorldMeta {
  name: string
  discoverer_name: string | null
  discoverer_id: string | null
  vote_scope: WorldVoteScope
}

async function worldMetaMap(admin: DB, ids: (string | null)[]): Promise<Map<string, WorldMeta>> {
  const unique = [...new Set(ids.filter(Boolean))] as string[]
  const m = new Map<string, WorldMeta>()
  if (!unique.length) return m
  const { data } = await admin.from('worlds').select('id, name, discoverer_name, discoverer_id, vote_scope').in('id', unique)
  for (const w of (data ?? []) as (WorldMeta & { id: string })[]) {
    m.set(w.id, {
      name: w.name,
      discoverer_name: w.discoverer_name,
      discoverer_id: w.discoverer_id,
      vote_scope: (w.vote_scope as WorldVoteScope) ?? 'all',
    })
  }
  return m
}

/** Resolve a set of world ids → { id: name }. */
async function worldNameMap(admin: DB, ids: (string | null)[]): Promise<Map<string, string>> {
  const meta = await worldMetaMap(admin, ids)
  const m = new Map<string, string>()
  for (const [k, v] of meta) m.set(k, v.name)
  return m
}

/** List all tasks for an investigation, sorted by day_index ASC. */
export async function listInvestigationTasks(threadId: string): Promise<SignalTask[]> {
  const admin = createAdminClient() as DB
  const { data } = await admin
    .from('signal_tasks')
    .select('id, task_date, type, prompt, is_published, sort_order, created_at, day_index, thread_id')
    .eq('thread_id', threadId)
    .order('day_index', { ascending: true })
  return (data ?? []) as SignalTask[]
}

/**
 * For every world in Signal Tuning, the latest live cover image — the first
 * selected visual asset from its most recent published day (doc 4.2.1: card
 * cover updates in real time). Audio-only days yield no cover. Returns
 * { [worldId]: imageUrl }.
 */
export async function getTuningCovers(): Promise<Record<string, string>> {
  const admin = createAdminClient() as DB
  const { data: threads } = await admin
    .from('signal_threads')
    .select('id, world_id')
    .not('world_id', 'is', null)
  const covers: Record<string, string> = {}

  type AssetRow = { id: string; media: string; processed_url: string | null; display_url: string | null }

  for (const th of (threads ?? []) as { id: string; world_id: string }[]) {
    // Latest two published days (newest first) — try the latest, fall back to the prior day.
    const { data: tasks } = await admin
      .from('signal_tasks')
      .select('id')
      .eq('thread_id', th.id)
      .eq('is_published', true)
      .order('day_index', { ascending: false })
      .limit(2)
    const taskList = (tasks ?? []) as { id: string }[]
    if (!taskList.length) continue

    let fallbackUrl: string | null = null  // first-by-order option, used if no day had any votes

    for (const task of taskList) {
      const { data: assets } = await admin
        .from('signal_task_assets')
        .select('id, media, processed_url, display_url, display_order')
        .eq('task_id', task.id)
        .eq('is_selected', true)
        .order('display_order', { ascending: true })
      const visuals = ((assets ?? []) as AssetRow[]).filter((a) => a.media === 'image' || a.media === 'video')
      if (!visuals.length) continue

      // Tally how many voyagers selected each asset on this day.
      const { data: resp } = await admin
        .from('signal_responses')
        .select('selected_asset_id')
        .eq('task_id', task.id)
      const counts: Record<string, number> = {}
      for (const r of (resp ?? []) as { selected_asset_id: string | null }[]) {
        if (r.selected_asset_id) counts[r.selected_asset_id] = (counts[r.selected_asset_id] ?? 0) + 1
      }

      // Most-selected visual; ties / no votes keep the first by display_order.
      let best = visuals[0]
      let bestCount = counts[best.id] ?? 0
      for (const a of visuals) {
        const c = counts[a.id] ?? 0
        if (c > bestCount) { best = a; bestCount = c }
      }
      const url = best.display_url || best.processed_url
      if (!url) continue

      if (bestCount > 0) { covers[th.world_id] = url; fallbackUrl = null; break }  // this day had votes — done
      if (!fallbackUrl) fallbackUrl = url  // remember in case neither day was voted on
    }

    if (!covers[th.world_id] && fallbackUrl) covers[th.world_id] = fallbackUrl
  }

  return covers
}

type Viewer = { id: string; role: string } | null

/** Build the published, vote-ready days for one thread (shared by feed + world page). */
// A published task that is visible to this viewer (revealed, or any day for an
// architect), with its computed reveal metadata — produced before the bulk
// asset/response fetch so we can batch by task id.
type VisibleDay = {
  taskId: string
  type: SignalTaskType
  prompt: string | null
  dayIndex: number
  revealAtISO: string | null
  revealed: boolean
}
type TaskRow = { id: string; type: SignalTaskType; prompt: string | null; day_index: number | null }
type RespRow = { user_id: string; selected_asset_id: string }

/** Filter published tasks to the days this viewer may see, with reveal metadata. */
function computeVisibleDays(taskRows: TaskRow[], anchorAt: string | null, intervalHours: number, isArchitect: boolean, now: Date): VisibleDay[] {
  const out: VisibleDay[] = []
  for (const t of taskRows) {
    const dayIndex = t.day_index ?? 0
    const at = computeRevealAt(anchorAt, intervalHours, dayIndex)
    const revealed = isRevealed(anchorAt, intervalHours, dayIndex, now)
    if (!revealed && !isArchitect) continue // public viewers only see revealed days
    out.push({ taskId: t.id, type: t.type, prompt: t.prompt, dayIndex, revealAtISO: at ? at.toISOString() : null, revealed })
  }
  return out
}

/** One batched fetch of selected assets + responses for many tasks, grouped by
 *  task id — replaces the per-day, per-aspect N+1 queries. */
async function fetchDayData(admin: DB, taskIds: string[]): Promise<{ assetsByTask: Map<string, PublicSignalAsset[]>; respByTask: Map<string, RespRow[]> }> {
  const assetsByTask = new Map<string, PublicSignalAsset[]>()
  const respByTask = new Map<string, RespRow[]>()
  if (!taskIds.length) return { assetsByTask, respByTask }
  const [{ data: assets }, { data: resp }] = await Promise.all([
    admin
      .from('signal_task_assets')
      .select('id, media, processed_url, display_url, asset_role, display_order, task_id')
      .in('task_id', taskIds)
      .eq('is_selected', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('signal_responses')
      .select('task_id, user_id, selected_asset_id')
      .in('task_id', taskIds),
  ])
  for (const a of (assets ?? []) as (PublicSignalAsset & { task_id: string })[]) {
    const arr = assetsByTask.get(a.task_id) ?? []
    arr.push({ id: a.id, media: a.media, processed_url: a.processed_url, display_url: a.display_url, asset_role: a.asset_role, display_order: a.display_order })
    assetsByTask.set(a.task_id, arr)
  }
  for (const r of (resp ?? []) as (RespRow & { task_id: string })[]) {
    const arr = respByTask.get(r.task_id) ?? []
    arr.push({ user_id: r.user_id, selected_asset_id: r.selected_asset_id })
    respByTask.set(r.task_id, arr)
  }
  return { assetsByTask, respByTask }
}

/** Assemble day objects from pre-fetched, grouped data — no queries. */
function assembleDays(visible: VisibleDay[], assetsByTask: Map<string, PublicSignalAsset[]>, respByTask: Map<string, RespRow[]>, me: Viewer, isArchitect: boolean): PublicInvestigation['days'] {
  return visible.map((v) => {
    const responses = respByTask.get(v.taskId) ?? []
    const mySelection = me ? (responses.find((r) => r.user_id === me.id)?.selected_asset_id ?? null) : null
    let distribution: Record<string, number> | null = null
    if (mySelection || isArchitect) {
      distribution = {}
      for (const r of responses) distribution[r.selected_asset_id] = (distribution[r.selected_asset_id] ?? 0) + 1
    }
    return {
      dayIndex: v.dayIndex,
      revealAt: v.revealAtISO,
      revealed: v.revealed,
      task: {
        id: v.taskId,
        type: v.type,
        prompt: v.prompt,
        assets: assetsByTask.get(v.taskId) ?? [],
        participantCount: responses.length,
        mySelection,
        distribution,
        thread: null,
      },
    }
  })
}

/** Published+visible days for ONE thread (world page). 4 queries regardless of
 *  day count: tasks + schedule (parallel), then assets + responses (batched). */
async function buildPublishedDays(admin: DB, threadId: string, me: Viewer, isArchitect: boolean): Promise<PublicInvestigation['days']> {
  const [{ data: taskRows }, { data: sched }] = await Promise.all([
    admin.from('signal_tasks').select('id, type, prompt, day_index').eq('thread_id', threadId).eq('is_published', true).order('day_index', { ascending: true }),
    admin.from('signal_threads').select('reveal_anchor_at, reveal_interval_hours').eq('id', threadId).maybeSingle(),
  ])
  const anchorAt: string | null = sched?.reveal_anchor_at ?? null
  const intervalHours: number = sched?.reveal_interval_hours ?? DEFAULT_REVEAL_INTERVAL_HOURS
  const visible = computeVisibleDays((taskRows ?? []) as TaskRow[], anchorAt, intervalHours, isArchitect, new Date())
  if (!visible.length) return []
  const { assetsByTask, respByTask } = await fetchDayData(admin, visible.map((v) => v.taskId))
  return assembleDays(visible, assetsByTask, respByTask, me, isArchitect)
}

type ThreadRow = { id: string; title: string | null; type: SignalTaskType; world_id: string | null }

/** Assemble a PublicInvestigation, resolving title/owner and per-viewer eligibility. */
function buildInvestigation(
  thread: ThreadRow,
  wm: WorldMeta | undefined,
  days: PublicInvestigation['days'],
  me: Viewer,
): PublicInvestigation {
  const voteScope = wm?.vote_scope ?? 'all'
  const can = eligibleToVote(me?.role ?? null, me?.id ?? null, voteScope, wm?.discoverer_id ?? null)
  return {
    id: thread.id,
    worldId: thread.world_id,
    title: wm?.name || thread.title || 'Investigation',
    discovererName: wm?.discoverer_name ?? null,
    type: thread.type,
    voteScope,
    canParticipate: can,
    lockReason: can ? null : lockReason(voteScope, !!me),
    days,
  }
}

/** Member-facing: all investigations with their published days, for the /signal page. */
export async function getInvestigationFeed(): Promise<InvestigationFeedData> {
  const admin = createAdminClient() as DB
  const me = await currentUser()
  const role = me?.role ?? null
  const isArchitect = role === 'architect'

  const now = new Date()

  // One thread query (with schedule cols) + one published-task query, then a
  // single batched assets+responses fetch and worldMetaMap — ~5 queries total
  // regardless of thread/day count (was a per-thread, per-day N+1).
  const { data: threadData } = await admin
    .from('signal_threads')
    .select('id, title, type, world_id, reveal_anchor_at, reveal_interval_hours')
    .order('created_at', { ascending: false })
  const threads = (threadData ?? []) as (ThreadRow & { reveal_anchor_at: string | null; reveal_interval_hours: number | null })[]
  if (!threads.length) return { investigations: [], role, loggedIn: !!me }

  const { data: taskData } = await admin
    .from('signal_tasks')
    .select('id, thread_id, type, prompt, day_index')
    .eq('is_published', true)
    .in('thread_id', threads.map((t) => t.id))
  const tasksByThread = new Map<string, TaskRow[]>()
  for (const t of (taskData ?? []) as (TaskRow & { thread_id: string })[]) {
    const arr = tasksByThread.get(t.thread_id) ?? []
    arr.push({ id: t.id, type: t.type, prompt: t.prompt, day_index: t.day_index })
    tasksByThread.set(t.thread_id, arr)
  }

  // Compute visible days per thread (in memory), gathering all task ids to batch.
  const visibleByThread = new Map<string, VisibleDay[]>()
  const allTaskIds: string[] = []
  for (const th of threads) {
    const rows = (tasksByThread.get(th.id) ?? []).sort((a, b) => (a.day_index ?? 0) - (b.day_index ?? 0))
    const visible = computeVisibleDays(rows, th.reveal_anchor_at ?? null, th.reveal_interval_hours ?? DEFAULT_REVEAL_INTERVAL_HOURS, isArchitect, now)
    if (visible.length) {
      visibleByThread.set(th.id, visible)
      for (const v of visible) allTaskIds.push(v.taskId)
    }
  }

  const [dayData, meta] = await Promise.all([
    fetchDayData(admin, allTaskIds),
    worldMetaMap(admin, threads.map((t) => t.world_id)),
  ])

  const investigations: PublicInvestigation[] = []
  for (const th of threads) {
    const visible = visibleByThread.get(th.id)
    if (!visible) continue
    const days = assembleDays(visible, dayData.assetsByTask, dayData.respByTask, me, isArchitect)
    const wm = th.world_id ? meta.get(th.world_id) : undefined
    investigations.push(buildInvestigation(th, wm, days, me))
  }

  return { investigations, role, loggedIn: !!me }
}

export interface WorldInvestigationData {
  investigation: PublicInvestigation | null
  role: string | null
  loggedIn: boolean
}

/** Member-facing: the single investigation (Signal Tuning) for one world, if any. */
export async function getWorldInvestigation(worldId: string): Promise<WorldInvestigationData> {
  const admin = createAdminClient() as DB
  const me = await currentUser()
  const role = me?.role ?? null
  const isArchitect = role === 'architect'

  const { data: thread } = await admin
    .from('signal_threads')
    .select('id, title, type, world_id')
    .eq('world_id', worldId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!thread) return { investigation: null, role, loggedIn: !!me }

  const days = await buildPublishedDays(admin, thread.id, me, isArchitect)
  if (days.length === 0) return { investigation: null, role, loggedIn: !!me }

  const meta = await worldMetaMap(admin, [(thread as ThreadRow).world_id])
  const wm = (thread as ThreadRow).world_id ? meta.get((thread as ThreadRow).world_id!) : undefined

  return {
    investigation: buildInvestigation(thread as ThreadRow, wm, days, me),
    role,
    loggedIn: !!me,
  }
}

// ─── Console dashboard board (doc 4.1) ────────────────────────────────────────

export interface DispatchDashboard {
  awaitingYou: number   // revealed (currently-open) days this viewer may vote on and hasn't
  inTuning: number      // currently-revealed signals across worlds in tuning
  yourWorlds: { id: string; name: string; stage: WorldStage }[]
}

/** Stats for the home-page Signal Dispatch board. Null for guests. */
export async function getDispatchDashboard(): Promise<DispatchDashboard | null> {
  const me = await currentUser()
  if (!me) return null
  const admin = createAdminClient() as DB

  const { data: pubTasks } = await admin
    .from('signal_tasks')
    .select('id, thread_id, day_index')
    .eq('is_published', true)
    .not('thread_id', 'is', null)
  const allTasks = (pubTasks ?? []) as { id: string; thread_id: string; day_index: number | null }[]

  // Reveal schedule per thread — only days that have actually surfaced count as
  // live/actionable (a published-but-future day is not yet doable).
  const threadIds = [...new Set(allTasks.map((t) => t.thread_id))]
  const threadWorld = new Map<string, string | null>()
  const threadSchedule = new Map<string, { anchor: string | null; interval: number }>()
  if (threadIds.length) {
    const { data: threads } = await admin
      .from('signal_threads')
      .select('id, world_id, reveal_anchor_at, reveal_interval_hours')
      .in('id', threadIds)
    for (const t of (threads ?? []) as { id: string; world_id: string | null; reveal_anchor_at: string | null; reveal_interval_hours: number | null }[]) {
      threadWorld.set(t.id, t.world_id)
      threadSchedule.set(t.id, { anchor: t.reveal_anchor_at ?? null, interval: t.reveal_interval_hours ?? DEFAULT_REVEAL_INTERVAL_HOURS })
    }
  }
  const meta = await worldMetaMap(admin, [...threadWorld.values()])

  const now = new Date()
  const tasks = allTasks.filter((t) => {
    const s = threadSchedule.get(t.thread_id)
    return isRevealed(s?.anchor ?? null, s?.interval ?? DEFAULT_REVEAL_INTERVAL_HOURS, t.day_index ?? 0, now)
  })
  const inTuning = tasks.length // revealed signals across worlds in tuning

  const { data: resp } = await admin.from('signal_responses').select('task_id').eq('user_id', me.id)
  const responded = new Set(((resp ?? []) as { task_id: string }[]).map((r) => r.task_id))

  // A world's currently-OPEN day is its latest revealed day; earlier revealed
  // days are past (expired) and must not inflate "awaiting you". Count at most
  // one per world — the current day, if unanswered and votable.
  const currentOpen = new Map<string, { id: string; day_index: number | null }>()
  for (const t of tasks) {
    const cur = currentOpen.get(t.thread_id)
    if (!cur || (t.day_index ?? 0) > (cur.day_index ?? 0)) currentOpen.set(t.thread_id, t)
  }

  let awaitingYou = 0
  for (const [threadId, t] of currentOpen) {
    if (responded.has(t.id)) continue
    const wid = threadWorld.get(threadId) ?? null
    const wm = wid ? meta.get(wid) : undefined
    if (eligibleToVote(me.role, me.id, wm?.vote_scope ?? 'all', wm?.discoverer_id ?? null)) awaitingYou++
  }

  const { data: mine } = await admin
    .from('worlds')
    .select('id, name, lifecycle_state')
    .eq('discoverer_id', me.id)
    .order('created_at', { ascending: false })
  const yourWorlds = ((mine ?? []) as { id: string; name: string; lifecycle_state: WorldLifecycle }[])
    .map((w) => ({ id: w.id, name: w.name, stage: worldStage(w.lifecycle_state) }))

  return { awaitingYou, inTuning, yourWorlds }
}
