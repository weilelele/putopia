import type { Metadata } from 'next'
import { DeviceArchiveClient } from './_components/device-archive-client'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Archive — Multiverse Collective',
  description: 'Follow active recoveries and explore every Multiverse Console batch.',
}

export default async function DevicesPage() {
  const batches = await listPublicDeviceBatches()
  return <DeviceArchiveClient batches={batches} />
}
