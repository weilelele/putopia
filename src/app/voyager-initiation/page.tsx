import type { Metadata } from 'next'
import { getInitiationPublicMembers } from '@/lib/actions/initiation-members'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { InitiationView } from './initiation-view'
import { deviceSourcePath } from './navigation'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { briefingRegions } from '@/lib/initiation-briefing'
import { shopifyBundlePilotConfig } from '@/lib/shopify-bundle-pilot'
import { guestPilotOffer, guestPilotPath } from '@/lib/shopify-guest-pilot'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Voyager Initiation · Multiverse Collective',
  description: 'Become a Voyager. Physical packs, classified intel and a place in the Collective.',
}

export default async function VoyagerInitiationPage({ searchParams }: { searchParams: Promise<{ checkout?: string; from?: string; bundle?: string; briefing?: string }> }) {
  const [snapshot, query, members, batches] = await Promise.all([getInitiationSnapshot(), searchParams, getInitiationPublicMembers(), listPublicDeviceBatches().catch(() => [])])
  const pilot = shopifyBundlePilotConfig(snapshot.userId)
  const pilotCheckout = pilot && snapshot.role === 'applicant' && snapshot.paymentStatus === 'none'
    ? pilot.kind : undefined
  const guestPilotUrl = !snapshot.userId && guestPilotOffer('initial') && guestPilotOffer('standard') ? guestPilotPath : undefined
  return <InitiationView initialBundle={query.bundle === 'standard' ? 'standard' : 'initial'} snapshot={snapshot} members={members} deviceSource={deviceSourcePath(query.from)} checkoutCanceled={query.checkout === 'canceled'} analyticsEnvironment={process.env.VERCEL_ENV ?? 'unknown'} regions={briefingRegions(batches)} briefingParam={query.briefing} pilotCheckout={pilotCheckout} guestPilotUrl={guestPilotUrl} pilotShipmentSync={!!pilot && snapshot.paymentStatus === 'paid'} paymentPlacement={pilotCheckout || guestPilotUrl ? 'top' : undefined} />
}
