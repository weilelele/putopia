import type { Metadata } from 'next'
import { VoyagerHub } from './voyager-hub'

export const metadata: Metadata = {
  title: 'Voyagers · Multiverse Collective',
  description: 'Meet the Voyagers of Multiverse Collective: players of a hardware-based sci-fi game who share observations from parallel worlds.',
}
export default async function VoyagersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <VoyagerHub tab={tab === 'members' || tab === 'logs' ? tab : 'feed'} />
}
