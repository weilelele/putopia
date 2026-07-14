/**
 * Cosmo → MCo puzzle sync (Signal Tuning v2).
 *
 * Cron-invoked server logic that turns a world's Cosmo expansion batches into
 * signal puzzle days. This is a PLAIN server lib (not a 'use server' action):
 * it is only ever imported server-side (by the sync cron), uses the service-role
 * admin client, and carries no per-user gate — the cron authorizes itself via
 * CRON_SECRET, the same pattern as recall.ts.
 *
 * v2 model: Cosmo owns the clock indirectly (it produces expansion batches); MCo
 * builds each batch into a puzzle day. Because Cosmo provides finished clips, the
 * tiles point straight at the Cosmo urls — no crop/glitch (which would need the
 * browser ffmpeg pipeline that can't run in a serverless cron) and no admin
 * hand-pick (tiles are auto-selected). New tables/queries are cast to `any`, the
 * project convention (see signal-tasks.ts).
 */
import { createAdminClient } from '@/lib/supabase/server'
import { getWorldExpansions, getWorldBootstrap } from '@/lib/cosmo'
import { buildSchedule, DEFAULT_GAP_HOURS } from '@/lib/signal/reveal'
import { setTaskPublished } from '@/lib/actions/signal-tasks'
import type { SignalTaskType } from '@/lib/actions/signal-tasks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const todayStr = () => new Date().toISOString().slice(0, 10)

// A puzzle needs at least a choice. Batches can partially fail (quota / content
// filter), so we don't require the full batch — but a 1-tile day is degenerate.
const MIN_PUZZLE_TILES = 2

export interface BuildDayResult {
  ok: boolean
  taskId?: string
  dayIndex?: number
  tileCount?: number
  sessionId?: string
  skipped?: boolean // a day for this thread+batch already existed (idempotent no-op)
  error?: string
}

/**
 * Build one DRAFT signal puzzle day for a thread from a world's newest Cosmo
 * expansion batch (the newest `sessionId` group that has playable clips).
 *
 * Mechanical only — creates the `signal_tasks` row (next day_index) and inserts
 * the batch's clips as auto-selected tiles. Does NOT publish (reveal timing /
 * recall / feed story is a separate step). `type` and `prompt` are the caller's
 * policy (the sync cron currently passes 'visual_match'); this function is
 * type-agnostic.
 *
 * Idempotent: it stamps the Cosmo batch's `sessionId` on the day and skips if a
 * day for this thread+batch already exists, so a cron retry/overlap is safe.
 */
export async function buildCosmoSignalDay(opts: {
  threadId: string
  worldId: string
  type: SignalTaskType
  prompt?: string | null
}): Promise<BuildDayResult> {
  const admin = createAdminClient() as DB

  // Newest expansion batch that actually has clips. getWorldExpansions is
  // newest-first; an expansion whose clip didn't resolve arrives with videos: []
  // and is skipped (can't make a tile from no clip).
  const expansions = await getWorldExpansions(opts.worldId)
  const withClips = expansions.filter((e) => e.videos.length > 0)
  if (withClips.length === 0) return { ok: false, error: 'No expansion clips available' }

  const sessionId = withClips[0].sessionId
  const batch = withClips.filter((e) => e.sessionId === sessionId)
  if (batch.length < MIN_PUZZLE_TILES) {
    return { ok: false, error: `Newest batch has too few clips for a puzzle (${batch.length})` }
  }

  // Idempotency: one day per (thread, Cosmo batch). A cron retry/overlap that
  // re-runs for the same newest batch must not create a second day — skip if one
  // already exists (the unique index in schema_v55 is the race backstop).
  const { data: existing } = await admin
    .from('signal_tasks')
    .select('id')
    .eq('thread_id', opts.threadId)
    .eq('cosmo_session_id', sessionId)
    .maybeSingle()
  if (existing) return { ok: true, skipped: true, taskId: existing.id, sessionId }

  // Next day index in the thread (continuity with the manual authoring path).
  const { data: latest } = await admin
    .from('signal_tasks')
    .select('day_index')
    .eq('thread_id', opts.threadId)
    .order('day_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextDayIndex = (latest?.day_index ?? -1) + 1

  // Draft day, stamped with the Cosmo batch it came from.
  const { data: task, error: taskErr } = await admin
    .from('signal_tasks')
    .insert({
      type: opts.type,
      prompt: opts.prompt ?? null,
      task_date: todayStr(),
      is_published: false,
      thread_id: opts.threadId,
      day_index: nextDayIndex,
      cosmo_session_id: sessionId,
    })
    .select('id')
    .single()
  if (taskErr || !task) {
    // Race backstop: the unique index rejected a concurrent duplicate.
    if ((taskErr as { code?: string } | null)?.code === '23505') {
      return { ok: true, skipped: true, sessionId }
    }
    return { ok: false, error: taskErr?.message ?? 'Task insert failed' }
  }

  // One auto-selected tile per expansion (its first clip). The Cosmo worker uploads
  // processed puzzle assets (glitched mp4 + animated webp) to Supabase Storage at
  // cosmo/{videoId}.{mp4,webp}; use them when present, else fall back to the raw clip
  // + poster still (processing is best-effort). `source_asset_id` is the Cosmo video
  // id, which Cosmo uses to resolve a crowd pick back to this expansion on settle.
  const BUCKET = 'signal-assets'
  const publicUrl = (p: string) =>
    admin.storage.from(BUCKET).getPublicUrl(p).data.publicUrl
  const tiles = await Promise.all(
    batch.map(async (e, i) => {
      const clip = e.videos[0]
      const videoId = clip.assetId
      const { data: found } = await admin.storage
        .from(BUCKET)
        .list('cosmo', { search: videoId })
      const names = new Set(
        (found ?? []).map((f: { name: string }) => f.name),
      )
      const hasMp4 = names.has(`${videoId}.mp4`)
      const hasWebp = names.has(`${videoId}.webp`)
      return {
        task_id: task.id,
        media: 'video',
        source_asset_id: videoId,
        source_url: clip.url,
        processed_url: hasMp4 ? publicUrl(`cosmo/${videoId}.mp4`) : clip.url,
        processed_path: hasMp4 ? `cosmo/${videoId}.mp4` : null,
        display_url: hasWebp
          ? publicUrl(`cosmo/${videoId}.webp`)
          : (clip.posterUrl ?? null),
        crop_config: {},
        asset_role: 'option',
        is_selected: true, // auto-selected — the v2 curation bypass
        display_order: i,
      }
    }),
  )
  const { error: tileErr } = await admin.from('signal_task_assets').insert(tiles)
  if (tileErr) return { ok: false, error: tileErr.message }

  return { ok: true, taskId: task.id, dayIndex: nextDayIndex, tileCount: tiles.length, sessionId }
}

// ── M4: emit crowd results back to Cosmo ─────────────────────────────────────

/**
 * Emit the raw crowd result for every published day of a thread whose 24h vote
 * window has closed and hasn't been emitted yet. Writes one cosmo_requests row
 * per day — `{ puzzleType, tiles: [{ assetId, votes }] }`, raw (Cosmo interprets
 * picked/rejected) — and stamps `cosmo_result_emitted_at` so a re-run skips it.
 *
 * `assetId` is each option tile's `source_asset_id` (the Cosmo video id); Cosmo
 * resolves it back to an expansion. Zero-vote days are still emitted (all tiles
 * at 0) — Cosmo reads no picks and simply produces the next batch.
 *
 * Window close is MCo's own schedule (reveal.ts): anchor = the thread's
 * reveal_anchor_at, else the world's scan_until; gap = the thread's gap_hours.
 */
export async function emitClosedResults(
  threadId: string,
): Promise<{ emitted: number; error?: string }> {
  const admin = createAdminClient() as DB
  const now = new Date()

  const { data: thread } = await admin
    .from('signal_threads')
    .select('world_id, reveal_anchor_at, gap_hours')
    .eq('id', threadId)
    .maybeSingle()
  if (!thread?.world_id) return { emitted: 0, error: 'Thread or world not found' }

  const { data: taskRows } = await admin
    .from('signal_tasks')
    .select('id, type, day_index, published_at, cosmo_result_emitted_at')
    .eq('thread_id', threadId)
    .eq('is_published', true)
    .order('day_index', { ascending: true })
  const tasks = (taskRows ?? []) as {
    id: string
    type: SignalTaskType
    day_index: number | null
    published_at: string | null
    cosmo_result_emitted_at: string | null
  }[]
  if (!tasks.length) return { emitted: 0 }

  // Anchor: an explicit restart wins; otherwise the world's scan_until.
  let anchorAt: string | null = thread.reveal_anchor_at ?? null
  if (!anchorAt) {
    const { data: w } = await admin.from('worlds').select('scan_until').eq('id', thread.world_id).maybeSingle()
    anchorAt = w?.scan_until ?? null
  }
  const gapHours: number = thread.gap_hours ?? DEFAULT_GAP_HOURS

  const schedule = buildSchedule(
    anchorAt,
    gapHours,
    tasks
      .filter((t) => t.published_at != null)
      .map((t) => ({ dayIndex: t.day_index ?? 0, publishedAtISO: t.published_at as string })),
  )
  const closeByDay = new Map(schedule.map((d) => [d.dayIndex, d.closeAt]))

  let emitted = 0
  for (const task of tasks) {
    if (task.cosmo_result_emitted_at) continue // already emitted
    const closeAt = closeByDay.get(task.day_index ?? 0)
    if (!closeAt || now <= closeAt) continue // window not closed yet

    // Tally votes per option tile → { assetId: source_asset_id, votes }.
    const [{ data: tileRows }, { data: respRows }] = await Promise.all([
      admin.from('signal_task_assets').select('id, source_asset_id, asset_role').eq('task_id', task.id).eq('is_selected', true),
      admin.from('signal_responses').select('selected_asset_id').eq('task_id', task.id),
    ])
    const counts: Record<string, number> = {}
    for (const r of (respRows ?? []) as { selected_asset_id: string }[]) {
      counts[r.selected_asset_id] = (counts[r.selected_asset_id] ?? 0) + 1
    }
    const tiles = ((tileRows ?? []) as { id: string; source_asset_id: string | null; asset_role: string }[])
      .filter((t) => t.asset_role !== 'main' && t.source_asset_id)
      .map((t) => ({ assetId: t.source_asset_id as string, votes: counts[t.id] ?? 0 }))

    const { error: reqErr } = await admin.from('cosmo_requests').insert({
      world_id: thread.world_id,
      type: 'expansion',
      payload: { puzzleType: task.type, tiles },
    })
    if (reqErr) return { emitted, error: reqErr.message }

    await admin.from('signal_tasks').update({ cosmo_result_emitted_at: now.toISOString() }).eq('id', task.id)
    emitted++
  }
  return { emitted }
}

/**
 * Kickstart a world's first batch: if it's bootstrapped in Cosmo and has no
 * request yet, write a cold cosmo_requests row (empty payload → Cosmo just
 * expands, no feedback). The row's existence is the dedup — once the loop is
 * going, any request means this never re-fires.
 */
export async function maybeEmitColdRequest(
  worldId: string,
): Promise<{ emitted: boolean; error?: string }> {
  const admin = createAdminClient() as DB

  const boot = await getWorldBootstrap(worldId)
  if (boot?.status !== 'bootstrapped') return { emitted: false }

  const { data: existing } = await admin
    .from('cosmo_requests')
    .select('id')
    .eq('world_id', worldId)
    .limit(1)
    .maybeSingle()
  if (existing) return { emitted: false }

  const { error } = await admin.from('cosmo_requests').insert({ world_id: worldId, type: 'expansion', payload: {} })
  if (error) return { emitted: false, error: error.message }
  return { emitted: true }
}

// ── M5: the sync cron orchestrator ───────────────────────────────────────────

// visual_match has no reference tile — the crowd picks the clip that best belongs,
// and interpretDay(match) affirms that winner. So the prompt must be reference-free
// (not the "same world as the reference" TYPE_HINT). Wording is a product call.
const MATCH_PROMPT_INTRO = 'New signals are surfacing from this world — which one reads as most real?'
const MATCH_PROMPT = 'Which of these signals reads as most real for this world?'

/** Build the next day from the newest Cosmo batch and publish it. Returns a short
 *  status for the run summary. A too-few-clips / no-batch result is skipped here;
 *  recoverStalledWorld re-requests a stranded batch on a later run. */
async function buildAndPublish(admin: DB, threadId: string, worldId: string): Promise<string> {
  // Intro copy on day 0, shared copy after — both reference-free.
  const { count } = await admin.from('signal_tasks').select('id', { count: 'exact', head: true }).eq('thread_id', threadId)
  const prompt = count && count > 0 ? MATCH_PROMPT : MATCH_PROMPT_INTRO

  const built = await buildCosmoSignalDay({ threadId, worldId, type: 'visual_match', prompt })
  if (!built.ok) return `no-build (${built.error})`
  if (built.skipped) return 'up-to-date'
  if (!built.taskId) return 'built-no-id'

  const pub = await setTaskPublished(built.taskId, true)
  return pub.ok ? `published day ${built.dayIndex}` : `publish-error (${pub.error})`
}

// Recovery: a request that never produced a published puzzle day. T must exceed
// the settle→produce→publish pipeline (up to ~2 daily-cron cycles) plus Cosmo's
// expansion retry window, so we never re-request a batch that's still legitimately
// in flight. After MAX owed requests with no published day, stop and surface the
// world as stuck rather than re-request into the void (the D1 spend guard).
const RECOVERY_TIMEOUT_MS = 72 * 60 * 60 * 1000 // 72h
const RECOVERY_MAX_REREQUESTS = 3

/**
 * If a world's latest request is older than T and NO puzzle day has been published
 * since it, the batch is owed-but-missing (expansion failed / was abandoned, or the
 * batch was unbuildable — too few clips). Re-request a cold batch (any picks were
 * already absorbed when feedback ran), bounded so a permanently-failing world can't
 * re-request forever. Keys on "no published day since the request", which captures
 * both failure modes: batch never landed AND batch landed-but-unbuildable.
 */
async function recoverStalledWorld(
  admin: DB,
  worldId: string,
  threadId: string,
): Promise<string> {
  const { data: latestReq } = await admin
    .from('cosmo_requests')
    .select('created_at')
    .eq('world_id', worldId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latestReq) return 'no-request' // cold path owns the first kick

  const latestReqAt = new Date(latestReq.created_at).getTime()
  if (Date.now() - latestReqAt < RECOVERY_TIMEOUT_MS) return 'within-window'

  const { data: latestPub } = await admin
    .from('signal_tasks')
    .select('published_at')
    .eq('thread_id', threadId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastPubAt = latestPub?.published_at
    ? new Date(latestPub.published_at).getTime()
    : 0
  if (lastPubAt > latestReqAt) return 'fulfilled' // latest request produced a day

  // Owed. Bound it: count requests with no published day after them.
  const sinceIso = new Date(lastPubAt).toISOString()
  const { count } = await admin
    .from('cosmo_requests')
    .select('id', { count: 'exact', head: true })
    .eq('world_id', worldId)
    .gt('created_at', sinceIso)
  if ((count ?? 0) >= RECOVERY_MAX_REREQUESTS) {
    console.warn(
      `[cosmo-sync] world ${worldId} stuck: ${count} requests since last published day, none produced a batch`,
    )
    return 'stuck'
  }

  await admin
    .from('cosmo_requests')
    .insert({ world_id: worldId, type: 'expansion', payload: {} })
  return 're-requested'
}

/** One sync run. Per SYNCING world (the stop gate): emit closed results, kickstart
 *  a cold world, recover a stalled one, and build+publish the next day. Errors are
 *  isolated per thread so one bad world can't abort the run. */
export async function runCosmoSync(): Promise<{ threads: number; results: unknown[] }> {
  const admin = createAdminClient() as DB

  // Only worlds actively in Signal Tuning. A graduated / abandoned world leaves
  // 'syncing' and drops out here — the loop, and its spend, stops.
  const { data: worlds } = await admin.from('worlds').select('id').eq('lifecycle_state', 'syncing')
  const worldIds = (worlds ?? []).map((w: { id: string }) => w.id)
  if (!worldIds.length) return { threads: 0, results: [] }

  // One thread per world is the true model; if a world ever has a dup thread,
  // keep only the canonical (latest) one so we don't emit/build twice for it.
  const { data: threadRows } = await admin
    .from('signal_threads')
    .select('id, world_id, created_at')
    .in('world_id', worldIds)
    .order('created_at', { ascending: false })
  const seen = new Set<string>()
  const threads: { id: string; world_id: string }[] = []
  for (const t of (threadRows ?? []) as { id: string; world_id: string; created_at: string }[]) {
    if (seen.has(t.world_id)) continue
    seen.add(t.world_id)
    threads.push({ id: t.id, world_id: t.world_id })
  }

  const results: unknown[] = []
  for (const th of threads) {
    try {
      const settled = await emitClosedResults(th.id)
      const cold = await maybeEmitColdRequest(th.world_id)
      const recovery = await recoverStalledWorld(admin, th.world_id, th.id)
      const build = await buildAndPublish(admin, th.id, th.world_id)
      results.push({
        worldId: th.world_id,
        settled: settled.emitted,
        cold: cold.emitted,
        recovery,
        build,
      })
    } catch (e) {
      results.push({ worldId: th.world_id, error: (e as Error).message })
    }
  }
  return { threads: threads.length, results }
}
