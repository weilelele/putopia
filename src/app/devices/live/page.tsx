import type { Metadata } from 'next'
import { DeviceLiveRoom } from './device-live-room'
import { DEVICE_BATCHES } from '@/lib/device-batches'

export const metadata: Metadata = {
  title: 'Device Live Room — Multiverse Collective',
  description: 'Portrait-first live observation prototype for Multiverse Console batches.',
}

export default function DeviceLivePage() {
  const batch = DEVICE_BATCHES.find((item) => item.slug === 'kyoto-relay-02') ?? DEVICE_BATCHES[0]
  return <DeviceLiveRoom batch={batch} batches={DEVICE_BATCHES} canPost={false} discussionPosts={[]} ownedConsole={null} />
}
