import type { Metadata } from 'next'
import { getInitiationPublicMembers } from '@/lib/actions/initiation-members'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { InitiationView } from './initiation-view'
import { beginVoyagerInitiation } from './actions'
import { deviceSourcePath } from './navigation'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Voyager Initiation · Multiverse Collective',
  description: 'Become a Voyager. Physical packs, classified intel and a place in the Collective.',
}

export default async function VoyagerInitiationPage({ searchParams }: { searchParams: Promise<{ checkout?: string; from?: string }> }) {
  const [snapshot, query, members] = await Promise.all([getInitiationSnapshot(), searchParams, getInitiationPublicMembers()])
  return <InitiationView snapshot={snapshot} members={members} deviceSource={deviceSourcePath(query.from)} checkoutCanceled={query.checkout === 'canceled'} beginCheckout={beginVoyagerInitiation} />
}
