import { notFound } from 'next/navigation'
import { MissionBoard } from '@/components/mission-board'
import { getPublicMissionEdition } from '@/lib/mission-board'

export const dynamic = 'force-dynamic'

export default function MissionBoardMediaPreview() {
  if (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV !== 'development') notFound()

  const edition = getPublicMissionEdition(Date.parse('2026-11-16T00:00:00+08:00'))
  return (
    <main className="main archive-console-page">
      <h1 className="sr-only">Mission Board preview</h1>
      <MissionBoard edition={edition} signedIn={false} initialMission="OBS-205" />
    </main>
  )
}
