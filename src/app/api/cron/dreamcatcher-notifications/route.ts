import { isCronAuthorized } from '@/lib/cron-auth'
import { sendDreamcatcherNotifications } from '@/lib/signal/dreamcatcher-notifications'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json({ ok: true, ...await sendDreamcatcherNotifications() })
}
