import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BatchDetailClient } from '../../_components/batch-detail-client'
import { getPublicDeviceBatch } from '@/lib/device-batch-repository'

export const dynamic = 'force-dynamic'

type BatchDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BatchDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const batch = await getPublicDeviceBatch(slug)

  if (!batch) return { title: 'Batch not found — Multiverse Collective' }

  return {
    title: `${batch.name} — Device Archive`,
    description: batch.summary,
  }
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { slug } = await params
  const batch = await getPublicDeviceBatch(slug)

  if (!batch) notFound()

  return <BatchDetailClient batch={batch} />
}
