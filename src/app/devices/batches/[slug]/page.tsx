import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DeviceRooms } from '../../_components/device-rooms'
import { getPublicDeviceBatch, listPublicDeviceBatches } from '@/lib/device-batch-repository'

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
  const batches = await listPublicDeviceBatches()
  const batch = batches.find((item) => item.slug === slug)
  if (!batch) notFound()

  return <DeviceRooms batches={batches} initialSlug={batch.slug} />
}
