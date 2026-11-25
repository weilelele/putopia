import type { Metadata } from 'next'
import { getInitiationPublicMembers } from '@/lib/actions/initiation-members'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { InitiationView } from './initiation-view'
import { deviceSourcePath } from './navigation'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { briefingRegions } from '@/lib/initiation-briefing'
import { shopifyBundlePilotConfig } from '@/lib/shopify-bundle-pilot'
import { guestPilotOffer, guestPilotPath } from '@/lib/shopify-guest-pilot'
import { faqPageJsonLd, initiationDescription, initiationProductJsonLd, serializeJsonLd } from '@/lib/site-seo'
import { INITIATION_FAQ_GROUPS, MEMBERSHIP_FAQ_GROUPS } from './faq'

export const dynamic = 'force-dynamic'
export function generateMetadata(): Metadata {
  return {
    title: 'Voyager Initiation · Multiverse Collective',
    description: initiationDescription({ membershipEnabled: process.env.INITIATION_MEMBERSHIP_ENABLED === 'true' }),
    alternates: { canonical: '/voyager-initiation' },
  }
}

export default async function VoyagerInitiationPage({ searchParams }: { searchParams: Promise<{ checkout?: string; from?: string; bundle?: string; briefing?: string }> }) {
  const [snapshot, query, members, batches] = await Promise.all([getInitiationSnapshot(), searchParams, getInitiationPublicMembers(), listPublicDeviceBatches().catch(() => [])])
  const membershipEnabled = process.env.INITIATION_MEMBERSHIP_ENABLED === 'true'
  const pilot = membershipEnabled ? null : shopifyBundlePilotConfig(snapshot.userId)
  const pilotCheckout = pilot && snapshot.role === 'applicant' && snapshot.paymentStatus === 'none'
    ? pilot.kind : undefined
  const guestPilotUrl = !membershipEnabled && !snapshot.userId && guestPilotOffer('initial') && guestPilotOffer('standard') ? guestPilotPath : undefined
  const structuredData = [initiationProductJsonLd({ membershipEnabled, seatsFull: snapshot.availability.initiated !== null && snapshot.availability.initiated >= snapshot.availability.capacity }), faqPageJsonLd(membershipEnabled ? MEMBERSHIP_FAQ_GROUPS : INITIATION_FAQ_GROUPS)]
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    <InitiationView membershipEnabled={membershipEnabled} initialBundle={query.bundle === 'standard' ? 'standard' : 'initial'} snapshot={snapshot} members={members} deviceSource={deviceSourcePath(query.from)} checkoutCanceled={query.checkout === 'canceled'} analyticsEnvironment={process.env.VERCEL_ENV ?? 'unknown'} regions={briefingRegions(batches)} briefingParam={query.briefing} pilotCheckout={pilotCheckout} guestPilotUrl={guestPilotUrl} pilotShipmentSync={!!pilot && snapshot.paymentStatus === 'paid'} paymentPlacement={pilotCheckout || guestPilotUrl ? 'top' : undefined} />
  </>
}
