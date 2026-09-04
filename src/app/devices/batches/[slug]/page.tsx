import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DeviceLiveRoom } from '../../live/device-live-room'
import { getPublicDeviceBatch, listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { getDeviceBatchDiscussion } from '@/lib/actions/device-batch-community'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { getDeviceCameraSource } from '@/lib/device-camera-source'

export const dynamic = 'force-dynamic'

type BatchDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BatchDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const batch = await getPublicDeviceBatch(slug)

  if (!batch) return { title: 'Batch not found — Multiverse Collective' }

  return {
    title: `${batch.name} — Device Live Room`,
    description: batch.summary,
  }
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { slug } = await params
  const batch = await getPublicDeviceBatch(slug)

  if (!batch) notFound()

  const [batches, discussion, consoles] = await Promise.all([
    listPublicDeviceBatches(),
    getDeviceBatchDiscussion(slug),
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
