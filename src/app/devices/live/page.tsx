import type { Metadata } from 'next'
import { DeviceLiveRoom } from './device-live-room'
import { DEVICE_BATCHES } from '@/lib/device-batches'
import { getDeviceLiveVideoPlaylist } from '@/lib/cosmo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Live Room — Multiverse Collective',
  description: 'Portrait-first live observation prototype for Multiverse Console batches.',
}

export default async function DeviceLivePage() {
  const batch = DEVICE_BATCHES.find((item) => item.slug === 'kyoto-relay-02') ?? DEVICE_BATCHES[0]
  const liveVideos = await getDeviceLiveVideoPlaylist().catch(() => [])
  return <DeviceLiveRoom batch={batch} batches={DEVICE_BATCHES} canPost={false} discussionPosts={[]} liveVideos={liveVideos} ownedConsole={null} />
}
