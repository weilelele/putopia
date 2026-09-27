import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { getWorldBootstraps, getWorldExpansions } from '@/lib/cosmo'
import { resolveCosmoSignalAsset } from './cosmo-assets'
import { selectRoundBatch } from './dreamcatcher-cosmo-model'

/** Reuse Dispatch's Supabase command inbox + read-only Cosmo Mongo connection.
 * This is an application cron adapter, not a new external worker protocol.
 * Network reads stay outside transactions; command emission and result receipt
 * are fenced/idempotent RPCs so overlapping cron runs cannot purchase twice.
 */
export async function syncDreamcatcherCosmo() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.from('dreamcatcher_generation_requests')
    .select('id,status,cosmo_request_id,baseline_sessions,created_at,dreamcatcher_rounds!inner(world_id,status)')
    .in('status', ['pending', 'running', 'failed'])
    .not('dreamcatcher_rounds.status', 'in', '(settled,cancelled)')
    .lte('available_at', new Date().toISOString())
    .order('last_polled_at', { ascending: true, nullsFirst: true }).order('created_at').limit(20)
  if (error) throw new Error(error.message)
  type Row = { id: string; status: string; cosmo_request_id: number | null; baseline_sessions: string[]; created_at: string; dreamcatcher_rounds: { world_id: string } }
  const rows = (data ?? []) as Row[]
  if (!rows.length) return []
  const bootstraps = await getWorldBootstraps(rows.map(q => q.dreamcatcher_rounds.world_id))
  const results: { requestId: string; status: string }[] = []
  // Bounded work per run; rotate unfinished worlds so one cannot starve others.
  const deadline = Date.now() + 35_000
  for (const q of rows) {
    if (Date.now() >= deadline) break
    const worldId = q.dreamcatcher_rounds.world_id
    const { error: touchError } = await admin.from('dreamcatcher_generation_requests')
      .update({ last_polled_at: new Date().toISOString() }).eq('id', q.id)
    if (touchError) throw new Error(touchError.message)
    try {
      const bootstrap = bootstraps.get(worldId)
      if (bootstrap !== 'bootstrapped') {
        if (bootstrap === 'rejected' || Date.now() - Date.parse(q.created_at) >= 72 * 3_600_000) {
          const { error: stalledError } = await admin.from('dreamcatcher_generation_requests').update({
            status: 'failed', last_error: bootstrap === 'rejected' ? 'Cosmo declined this world' : 'Waiting for existing Cosmo onboarding for over 72 hours',
            available_at: new Date(Date.now() + 300_000).toISOString(),
          }).eq('id', q.id).in('status', ['pending', 'running', 'failed'])
          if (stalledError) throw new Error(stalledError.message)
        }
        results.push({ requestId: q.id, status: bootstrap ?? 'not-onboarded' })
        continue
      }
      const expansions = await getWorldExpansions(worldId)
      if (q.cosmo_request_id === null) {
        const { error: dispatchError } = await admin.rpc('dispatch_dreamcatcher_generation', {
          p_request: q.id, p_sessions: [...new Set(expansions.map(e => e.sessionId))],
        })
        if (dispatchError) throw new Error(dispatchError.message)
        results.push({ requestId: q.id, status: 'requested' })
        continue
      }
      const batch = selectRoundBatch(expansions, q.baseline_sessions)
      if (!batch) {
        if (Date.now() - Date.parse(q.created_at) >= 72 * 3_600_000) {
          const { error: stalledError } = await admin.from('dreamcatcher_generation_requests').update({
            status: 'failed', last_error: 'No complete new Cosmo batch after 72 hours; inspect the existing request before regenerating',
            available_at: new Date(Date.now() + 300_000).toISOString(),
          }).eq('id', q.id).in('status', ['running', 'failed'])
          if (stalledError) throw new Error(stalledError.message)
        }
        results.push({ requestId: q.id, status: 'awaiting-assets' })
        continue
      }
      const assets = await Promise.all(batch.clips.map(async (clip, order) => ({
        ...await resolveCosmoSignalAsset(admin, clip), order,
      })))
      const { data: accepted, error: receiveError } = await admin.rpc('complete_dreamcatcher_generation', {
        p_request: q.id, p_result: { sessionId: batch.sessionId, assets },
      })
      if (receiveError) throw new Error(receiveError.message)
      results.push({ requestId: q.id, status: accepted ? 'ready' : 'superseded' })
    } catch (cause) {
      // Preserve the command ID. Retrying a read never emits another expansion.
      const message = cause instanceof Error ? cause.message : 'Cosmo sync failed'
      const { error: recordError } = await admin.from('dreamcatcher_generation_requests').update({
        status: 'failed', last_error: message.slice(0, 500), available_at: new Date(Date.now() + 300_000).toISOString(),
      }).eq('id', q.id).in('status', ['pending', 'running', 'failed'])
      if (recordError) throw new Error(recordError.message)
      results.push({ requestId: q.id, status: 'retry-sync' })
    }
  }
  return results
}
