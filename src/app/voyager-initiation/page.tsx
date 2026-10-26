import type { Metadata } from 'next'
import { getInitiationPublicMembers } from '@/lib/actions/initiation-members'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { InitiationView } from './initiation-view'
import { beginVoyagerInitiation } from './actions'
import { deviceSourcePath } from './navigation'
import { guestClaimNotice } from '@/lib/guest-checkout'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { briefingRegions } from '@/lib/initiation-briefing'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Voyager Initiation · Multiverse Collective',
  description: 'Become a Voyager. Physical packs, classified intel and a place in the Collective.',
}

export default async function VoyagerInitiationPage({ searchParams }: { searchParams: Promise<{ checkout?: string; from?: string; bundle?: string; briefing?: string; claim?: string }> }) {
  const [snapshot, query, members, batches] = await Promise.all([getInitiationSnapshot({ allowAnonymous: true }), searchParams, getInitiationPublicMembers(), listPublicDeviceBatches().catch(() => [])])
  return <InitiationView initialBundle={query.bundle === 'standard' ? 'standard' : 'initial'} snapshot={snapshot} members={members} deviceSource={deviceSourcePath(query.from)} checkoutCanceled={query.checkout === 'canceled'} beginCheckout={beginVoyagerInitiation} analyticsEnvironment={process.env.VERCEL_ENV ?? 'unknown'} regions={briefingRegions(batches)} briefingParam={query.briefing} claimNotice={guestClaimNotice(query.claim)} />
}
