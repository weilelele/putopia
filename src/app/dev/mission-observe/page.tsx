import { notFound } from 'next/navigation'
import { MissionObserve } from './mission-observe'
import './observe.css'

export const dynamic = 'force-dynamic'
export default async function MissionObservePage({ searchParams }: {
  searchParams: Promise<{ world?: string }>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { world } = await searchParams
  return <MissionObserve worldId={world} />
}
