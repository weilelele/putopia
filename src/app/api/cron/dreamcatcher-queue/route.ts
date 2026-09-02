import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveCompletedScans } from '@/lib/signal/scan-resolve'
import { isCronAuthorized } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!isCronAuthorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.rpc('advance_dreamcatcher_jobs', {
    p_now: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Preserve the established success/failure email rules, but resolve them on
  // the fixed-round cadence instead of waiting for the legacy daily cron.
  const scan = await resolveCompletedScans()
  return NextResponse.json({ ok: true, result: data?.[0] ?? { started: 0, finished: 0 }, scan })
}
