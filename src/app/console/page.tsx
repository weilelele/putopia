import { getDashboardIdentity, getDashboardOverview, getDashboardUpdates, getDashboardEvents } from '@/lib/actions/dashboard'
import ConsoleClient from './console-client'
export const dynamic = 'force-dynamic'
export default async function ConsolePage() {
  const overview = getDashboardOverview()
  const updates = getDashboardUpdates()
  const events = getDashboardEvents()
  const initial = await getDashboardIdentity()
  return <ConsoleClient key={`${initial.viewerId ?? 'guest'}:${initial.voyager?.role ?? 'guest'}`} initial={initial} overview={overview} updates={updates} events={events} />
}
