import { getSignalFeed } from '@/lib/actions/signal-tasks'
import { SignalFeed } from './SignalFeed'

export const dynamic = 'force-dynamic'

export default async function SignalPage() {
  const feed = await getSignalFeed()
  return <SignalFeed initial={feed} />
}
