import { MissionObserve } from './mission-observe'
import './observe.css'

export default async function MissionObservePage({ searchParams }: {
  searchParams: Promise<{ world?: string }>
}) {
  const { world } = await searchParams
  return <MissionObserve worldId={world} />
}
