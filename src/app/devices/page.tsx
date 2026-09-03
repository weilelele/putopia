import type { Metadata } from 'next'
import { DeviceLiveRoom } from './live/device-live-room'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { getDeviceBatchDiscussion } from '@/lib/actions/device-batch-community'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { getDeviceCameraSource } from '@/lib/device-camera-source'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Library — Multiverse Collective',
  description: 'Watch active recoveries and follow every Multiverse Console batch.',
}

export default async function DevicesPage() {
  const batches = await listPublicDeviceBatches()
  const batch = batches[0]
  if (!batch) return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl">DEVICE LIBRARY</h1>
      <p className="mt-4">No device batches have been published yet. Check back for recovery updates.</p>
    </main>
  )
  const [discussion, consoles] = await Promise.all([
    getDeviceBatchDiscussion(batch.slug),
    getMyDeviceConsoles(),
  ])
  const ownedConsole = consoles.find((console) => console.order.device_batch_slug === batch.slug) ?? null
  return (
    <DeviceLiveRoom
      batch={batch}
      camera={getDeviceCameraSource(batch)}
      batches={batches}
      canPost={discussion.canPost}
      discussionPosts={discussion.posts}
      ownedConsole={ownedConsole}
    />
  )
}
