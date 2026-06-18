'use server'

import { getAllDevices } from './devices'
import { getPublicIntel } from './intel'
import { getCommentCountsBulk } from './comments'
import { getAllVotes, getVoteResultsBulk, getMyVoteResponses } from './votes'
import { getAllWorlds } from './worlds'
import { getMcFunctions } from './mc-functions'
import { getActivityFeed } from './activity-events'
import type { Device, Vote, World, McFunction, IntelWithAvatar } from '@/types/database'
import type { ActivityEvent } from './activity-events'

export interface DashboardData {
  devices: Device[]
  latestIntel: IntelWithAvatar[]
  intelCommentCounts: Record<string, number>
  activityEvents: ActivityEvent[]
  latestVotes: Vote[]
  voteTallies: Record<string, Record<string, number>>
  myVoteResponses: { vote_id: string; selected_options: string[] }[]
  latestWorlds: World[]
  mcFunctions: McFunction[]
}

const EMPTY: DashboardData = {
  devices: [],
  latestIntel: [],
  intelCommentCounts: {},
  activityEvents: [],
  latestVotes: [],
  voteTallies: {},
  myVoteResponses: [],
  latestWorlds: [],
  mcFunctions: [],
}

/**
 * Single aggregated read for the console/dashboard.
 *
 * The dashboard previously fired ~8 separate server actions from the client.
 * Server actions dispatch through a single serial queue, so they ran one after
 * another — each section popped in as its round-trip finished. Here we run every
 * query in parallel server-side (`Promise.all`) behind one round-trip, so the
 * client gets the whole payload at once and renders all sections together.
 *
 * Per-fetch `.catch` mirrors the old behaviour: a broken section degrades to
 * empty instead of failing the whole dashboard.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const onErr = (where: string) => (e: unknown) => {
    console.error(`[dashboard] ${where} failed:`, (e as Error)?.message ?? e)
    return undefined
  }

  const [
    devices,
    intelBundle,
    activityEvents,
    latestWorlds,
    mcFunctions,
    votesBundle,
    myVoteResponses,
  ] = await Promise.all([
    getAllDevices()
      .then((all) => {
        const unknown = all.filter((d) => d.knowledge === 'unknown').slice(0, 1)
        const known = all.filter((d) => d.knowledge === 'known').slice(0, 2)
        return [...unknown, ...known]
      })
      .catch(onErr('getAllDevices')),

    getPublicIntel()
      .then(async (intel) => {
        const slice = (intel as IntelWithAvatar[]).slice(0, 3)
        const counts = slice.length
          ? await getCommentCountsBulk('intel', slice.map((e) => e.id))
          : {}
        return { latestIntel: slice, intelCommentCounts: counts }
      })
      .catch(onErr('getPublicIntel')),

    getActivityFeed(7).catch(onErr('getActivityFeed')),

    getAllWorlds()
      .then((w) => [...w].reverse().slice(0, 4))
      .catch(onErr('getAllWorlds')),

    getMcFunctions()
      .then((fns) => fns as McFunction[])
      .catch(onErr('getMcFunctions')),

    getAllVotes()
      .then(async (votes) => {
        const active = votes.filter((v) => v.is_active).slice(0, 3)
        const tallies = active.length
          ? await getVoteResultsBulk(active.map((v) => v.id))
          : {}
        return { latestVotes: active, voteTallies: tallies }
      })
      .catch(onErr('getAllVotes')),

    getMyVoteResponses().catch(onErr('getMyVoteResponses')),
  ])

  return {
    devices: devices ?? EMPTY.devices,
    latestIntel: intelBundle?.latestIntel ?? EMPTY.latestIntel,
    intelCommentCounts: intelBundle?.intelCommentCounts ?? EMPTY.intelCommentCounts,
    activityEvents: activityEvents ?? EMPTY.activityEvents,
    latestVotes: votesBundle?.latestVotes ?? EMPTY.latestVotes,
    voteTallies: votesBundle?.voteTallies ?? EMPTY.voteTallies,
    myVoteResponses: myVoteResponses ?? EMPTY.myVoteResponses,
    latestWorlds: latestWorlds ?? EMPTY.latestWorlds,
    mcFunctions: mcFunctions ?? EMPTY.mcFunctions,
  }
}
