import { getInvestigationFeed } from '@/lib/actions/signal-tasks'
import { InvestigationFeed } from './SignalFeed'

export const dynamic = 'force-dynamic'

export default async function SignalPage() {
  const feed = await getInvestigationFeed()
  return <InvestigationFeed initial={feed} />
}
