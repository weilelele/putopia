'use server'

/**
 * Signal Scanning outcome resolution. When a world's scan window (scan_until)
 * closes we email the proposer exactly once: the "your world really exists"
 * success email if a signal was tuned in the window, otherwise the "scan came
 * back empty" failure email. scan_resolved_at is the idempotency guard, claimed
 * before any send, so the cron and an opportunistic page-view never double-send.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { maybeSendWorldConfirmedEmail } from './world-confirmed-email'
import { sendScanFailedEmail } from './scan-failed-email'
import { SCAN_NOTIFICATIONS_ENABLED } from './scan-notification-policy'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

/** True if the world has at least one published signal day (a tuned signal). */
async function hasPublishedSignal(admin: DB, worldId: string): Promise<boolean> {
  const { data: thread } = await admin
    .from('signal_threads')
    .select('id')
    .eq('world_id', worldId)
    .maybeSingle()
  if (!thread?.id) return false
  const { count } = await admin
    .from('signal_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', thread.id)
    .eq('is_published', true)
  return !!count
}

/**
 * Resolve one world's completed scan exactly once. Returns whether it resolved
 * and which outcome. Safe to call from the detail page, the cron, or both.
 */
export async function resolveWorldScan(
  worldId: string,
): Promise<{ resolved: boolean; outcome?: 'ready' | 'failed' }> {
  // Pause before claiming an outcome: no reads, writes, email, or push.
  if (!SCAN_NOTIFICATIONS_ENABLED) return { resolved: false }

  const admin = createAdminClient() as DB

  const { data: world } = await admin
    .from('worlds')
    .select('id, scan_until, scan_resolved_at')
    .eq('id', worldId)
    .maybeSingle()
  if (!world || !world.scan_until || world.scan_resolved_at) return { resolved: false }
  if (new Date(world.scan_until).getTime() > Date.now()) return { resolved: false } // window still open

  // Claim the slot — concurrent callers (cron + page view) can't double-send.
  const { data: claimed, error: claimErr } = await admin
    .from('worlds')
    .update({ scan_resolved_at: new Date().toISOString() })
    .eq('id', worldId)
    .is('scan_resolved_at', null)
    .select('id')
  if (claimErr || !claimed?.length) return { resolved: false }

  const ready = await hasPublishedSignal(admin, worldId)
  if (ready) await maybeSendWorldConfirmedEmail(worldId)
  else await sendScanFailedEmail(worldId)
  return { resolved: true, outcome: ready ? 'ready' : 'failed' }
}

/** Batch-resolve every world whose scan window has closed but isn't resolved. */
export async function resolveCompletedScans(): Promise<{
  checked: number
  resolved: number
  ready: number
  failed: number
}> {
  if (!SCAN_NOTIFICATIONS_ENABLED) return { checked: 0, resolved: 0, ready: 0, failed: 0 }

  const admin = createAdminClient() as DB
  const { data } = await admin
    .from('worlds')
    .select('id')
    .not('scan_until', 'is', null)
    .lte('scan_until', new Date().toISOString())
    .is('scan_resolved_at', null)
    .limit(200)

  const ids: string[] = ((data ?? []) as { id: string }[]).map((w) => w.id)
  let resolved = 0, ready = 0, failed = 0
  for (const id of ids) {
    const r = await resolveWorldScan(id)
    if (r.resolved) {
      resolved++
      if (r.outcome === 'ready') ready++
      else failed++
    }
  }
  return { checked: ids.length, resolved, ready, failed }
}
