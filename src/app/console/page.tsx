import { getDashboardIdentity, getDashboardOverview, getDashboardUpdates, getDashboardEvents } from '@/lib/actions/dashboard'
import { getArchivedMissionPreview, getPublicMissionEdition } from '@/lib/mission-board'
import { MissionBoard } from '@/components/mission-board'
import ConsoleClient from './console-client'

export const dynamic = 'force-dynamic'

export default async function ConsolePage({ searchParams }: {
  searchParams: Promise<{ mission?: string | string[] }>
}) {
  const overview = getDashboardOverview()
  const updates = getDashboardUpdates()
  const events = getDashboardEvents()
  const [initial, params] = await Promise.all([getDashboardIdentity(), searchParams])
  const edition = getPublicMissionEdition()
  const initialMission = typeof params.mission === 'string' ? params.mission : undefined
  const archivedMission = initialMission ? getArchivedMissionPreview(initialMission, Date.parse(edition.startsAt)) : undefined

  return (
    <ConsoleClient key={`${initial.viewerId ?? 'guest'}:${initial.voyager?.role ?? 'guest'}`}
      initial={initial} overview={overview} updates={updates} events={events}>
      <MissionBoard key={`${edition.startsAt}:${initialMission ?? ''}`}
        edition={edition} signedIn={!!initial.viewerId} initialMission={initialMission} archivedMission={archivedMission} />
    </ConsoleClient>
  )
}
