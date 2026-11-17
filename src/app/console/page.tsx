import { getDashboardIdentity, getDashboardOverview, getDashboardUpdates, getDashboardEvents } from '@/lib/actions/dashboard'
import { getArchivedMissionPreview, getPublicMissionEdition } from '@/lib/mission-board'
import { getMyDigitalAccessRole } from '@/lib/actions/digital-access'
import { hasVoyagerAccess } from '@/lib/digital-access'
import { MissionBoard } from '@/components/mission-board'
import ConsoleClient from './console-client'

export const dynamic = 'force-dynamic'

export default async function ConsolePage({ searchParams }: {
  searchParams: Promise<{ mission?: string | string[] }>
}) {
  const overview = getDashboardOverview()
  const updates = getDashboardUpdates()
  const events = getDashboardEvents()
  const [initial, params, accessRole] = await Promise.all([getDashboardIdentity(), searchParams, getMyDigitalAccessRole().catch(() => null)])
  const edition = getPublicMissionEdition()
  const initialMission = typeof params.mission === 'string' ? params.mission : undefined
  const canReadBriefings = hasVoyagerAccess(accessRole)
  const archivedMission = initialMission ? getArchivedMissionPreview(initialMission, Date.parse(edition.startsAt)) : undefined

  const forViewer = (mission: (typeof edition.missions)[number]) => canReadBriefings
    ? mission
    : { ...mission, preview: '', image: undefined }

  return (
    <ConsoleClient key={`${initial.viewerId ?? 'guest'}:${initial.voyager?.role ?? 'guest'}`}
      initial={initial} overview={overview} updates={updates} events={events}>
      <MissionBoard key={`${edition.startsAt}:${initialMission ?? ''}`}
        edition={{ ...edition, missions: edition.missions.map(forViewer) }} signedIn={!!initial.viewerId}
        initialMission={initialMission} archivedMission={archivedMission ? forViewer(archivedMission) : undefined} />
    </ConsoleClient>
  )
}
