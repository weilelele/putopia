import { syncDreamcatcherCosmo } from '@/lib/signal/dreamcatcher-cosmo-sync'
import { advanceDreamcatcherRounds } from '@/lib/dreamcatcher-rounds'
import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!isCronAuthorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await advanceDreamcatcherRounds()
  const cosmo = await syncDreamcatcherCosmo()
  await advanceDreamcatcherRounds()
  return NextResponse.json({ ok: true, cosmo })
}
