import { McConsolePanel } from '@/components/mc-console-panel'
import { RootBrandHeader } from '@/components/root-brand-header'
import consoleStyles from '@/components/mc-console-panel.module.css'
import type { Metadata } from 'next'
import { DeviceRooms } from './_components/device-rooms'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { serializeJsonLd } from '@/lib/site-seo'
import { devicesPageVideosJsonLd } from '@/lib/video-seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Library — Multiverse Collective',
  description: 'Watch active recoveries and follow every Multiverse Console batch.',
}

export default async function DevicesPage() {
  const batches = await listPublicDeviceBatches()
  const batch = batches[0]
  // Without a batch the panel shows its slideshow instead of the hero reel.
  const videos = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(devicesPageVideosJsonLd({ heroVideo: !!batch })) }} />
  if (!batch) return (
    <main className="main">
      {videos}
      <h1 className="sr-only">Devices</h1>
      <RootBrandHeader />
      <McConsolePanel />
      <h2 className={consoleStyles.sectionTitle}>Found Devices Around The World</h2>
      <p className="mt-4">No device batches have been published yet. Check back for recovery updates.</p>
    </main>
  )
  return <>
    {videos}
    <DeviceRooms batches={batches} initialSlug={batch.slug} />
  </>
}
