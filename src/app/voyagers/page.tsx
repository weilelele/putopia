import { VoyagerHub } from './voyager-hub'
export default async function VoyagersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <VoyagerHub tab={tab === 'members' || tab === 'logs' ? tab : 'feed'} />
}
