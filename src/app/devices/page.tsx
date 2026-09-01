import type { Metadata } from 'next'
import { DeviceLiveRoom } from './live/device-live-room'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { getDeviceBatchDiscussion } from '@/lib/actions/device-batch-community'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { getDeviceLiveVideoPlaylist } from '@/lib/cosmo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Library — Multiverse Collective',
  description: 'Watch active recoveries and follow every Multiverse Console batch.',
}

export default async function DevicesPage() {
  const [batches, liveVideos] = await Promise.all([
    listPublicDeviceBatches(),
    getDeviceLiveVideoPlaylist().catch(() => []),
  ])
  const batch = batches[0]
  if (!batch) return null
  const [discussion, consoles] = await Promise.all([
    getDeviceBatchDiscussion(batch.slug),
    getMyDeviceConsoles(),
  ])
  const ownedConsole = consoles.find((console) => console.order.device_batch_slug === batch.slug) ?? null
  return (
    <DeviceLiveRoom
      batch={batch}
      batches={batches}
      canPost={discussion.canPost}
      discussionPosts={discussion.posts}
      liveVideos={liveVideos}
      ownedConsole={ownedConsole}
    />
  )
}
