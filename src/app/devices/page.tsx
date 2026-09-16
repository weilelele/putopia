import { getMcFunctions } from '@/lib/actions/mc-functions'
import { McConsolePanel } from '@/components/mc-console-panel'
import type { Metadata } from 'next'
import { DeviceRooms } from './_components/device-rooms'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Library — Multiverse Collective',
  description: 'Watch active recoveries and follow every Multiverse Console batch.',
}

export default async function DevicesPage() {
  const batches = await listPublicDeviceBatches()
  const batch = batches[0]
  if (!batch) return (
    <main className="main">
      <h1 className="sr-only">Devices</h1>
      <McConsolePanel mcFunctions={await getMcFunctions()} />
      <h2>Found Around the World</h2>
      <p className="mt-4">No device batches have been published yet. Check back for recovery updates.</p>
    </main>
  )
  return <DeviceRooms batches={batches} initialSlug={batch.slug} />
}
