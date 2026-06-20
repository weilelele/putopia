import { getSignalFeed } from '@/lib/actions/signal-feed'
import { FeedProtoClient } from './feed-client'

export const dynamic = 'force-dynamic'

export default async function FeedProtoPage() {
  const entries = await getSignalFeed()
  return <FeedProtoClient entries={entries} />
}
