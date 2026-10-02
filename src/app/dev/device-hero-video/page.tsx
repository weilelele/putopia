import type { Metadata } from 'next'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { McConsolePanel } from '@/components/mc-console-panel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device hero video test',
  robots: { index: false, follow: false },
}

// Test bed: the Device page intro with the onboarding reel in place of the
// image slideshow. `?view=video|slideshow` isolates one; default shows both.
export default async function DeviceHeroVideoTest({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const mcFunctions = await getMcFunctions().catch(() => [])
  const video = { src: '/assets/device-reel.mp4', poster: '/assets/device-reel-poster.jpg' }
  return <main className="main">
    <h1 className="sr-only">Device hero video test</h1>
    {view !== 'slideshow' ? <><p>B · VIDEO (onboarding reel)</p><McConsolePanel mcFunctions={mcFunctions} heroVideo={video} /></> : null}
    {!view ? <hr /> : null}
    {view !== 'video' ? <><p>A · CURRENT SLIDESHOW</p><McConsolePanel mcFunctions={mcFunctions} /></> : null}
  </main>
}
