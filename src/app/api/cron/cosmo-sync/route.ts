import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { runCosmoSync } from '@/lib/signal/cosmo-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cosmo → MCo sync (Signal Tuning v2). Per SYNCING world, each run: emits closed
 * puzzle results back to Cosmo, kickstarts a cold world, and builds + publishes
 * the next day from the newest Cosmo expansion batch.
 *
 * NOTE: a daily cadence means the gap between puzzle windows is ~24h. `gap_hours`
 * on each thread MUST be >= that cron gap, or reveal.ts's tuningPhase false-alarms
 * into `search_failed` and the recall/engagement path emails users. Confirm before
 * a live run.
 */
export async function GET(request: NextRequest) {
  // Auth: a valid CRON_SECRET (Vercel Cron) OR an authenticated architect.
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const hasCronSecret = !!secret && auth === `Bearer ${secret}`

  if (!hasCronSecret) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    let isArchitect = false
    if (user) {
      const adminCheck = createAdminClient()
      const { data: profile } = await adminCheck
        .from('voyager_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      isArchitect = profile?.role === 'architect'
    }
    if (!isArchitect) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sync = await runCosmoSync()
  return Response.json({ ok: true, sync })
}
