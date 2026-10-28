import { roundVoteAccess, type RoundStatus, type RoundViewer } from './dreamcatcher-round-model'
import { buildSchedule, tuningPhase, DEFAULT_GAP_HOURS } from './signal/reveal'

export type DispatchTask = { id: string; thread_id: string; day_index: number | null; published_at: string | null; dreamcatcher_round_id: string | null }
export type DispatchThread = { id: string; world_id: string | null; reveal_anchor_at: string | null; gap_hours: number | null }
export type DispatchWorld = { id: string; name: string; discoverer_id: string | null; vote_scope: string; scan_until: string | null; lifecycle_state: string }
export type DispatchRound = { id: string; world_id: string; task_id: string | null; round_number: number; status: RoundStatus; initiator_id: string; opened_at: string | null; closes_at: string | null }

/** Only the latest published round can supply a Dashboard card. */
export function latestDispatchRounds(rounds: DispatchRound[], tasks: DispatchTask[]) {
  const published = new Set(tasks.map(task => task.id))
  const latest = new Map<string, DispatchRound>()
  for (const round of rounds) {
    if (!round.task_id || !published.has(round.task_id)) continue
    const previous = latest.get(round.world_id)
    if (!previous || round.round_number > previous.round_number) latest.set(round.world_id, round)
  }
  return [...latest.values()]
}

/** Same schedule/access rules as the investigation page, without its history or media. */
export function dashboardDispatch(input: {
  tasks: DispatchTask[]; threads: DispatchThread[]; worlds: DispatchWorld[]; rounds: DispatchRound[]
  responded: string[]; roundResponses: { task_id: string }[]; viewer: RoundViewer; now: number
}) {
  const worlds = new Map(input.worlds.map(world => [world.id, world]))
  const responded = new Set(input.responded)
  const openWorlds: { id: string; name: string; openedAt: string }[] = []
  const awaitingWorldIds: string[] = []
  let awaitingYou = 0
  const byThread = new Map<string, DispatchTask[]>()
  for (const task of input.tasks) {
    if (task.dreamcatcher_round_id) continue
    const group = byThread.get(task.thread_id) ?? []
    group.push(task)
    byThread.set(task.thread_id, group)
  }
  const viewer = input.viewer
  for (const thread of input.threads) {
    const world = worlds.get(thread.world_id ?? '')
    const rows = byThread.get(thread.id) ?? []
    const schedule = buildSchedule(thread.reveal_anchor_at ?? world?.scan_until ?? null, thread.gap_hours ?? DEFAULT_GAP_HOURS,
      rows.flatMap(task => task.published_at ? [{ dayIndex: task.day_index ?? 0, publishedAtISO: task.published_at }] : []))
    const phase = tuningPhase(schedule, thread.gap_hours ?? DEFAULT_GAP_HOURS, new Date(input.now))
    if (phase.kind !== 'open') continue
    const task = rows.find(task => (task.day_index ?? 0) === phase.index)
    const opened = schedule.find(day => day.dayIndex === phase.index)
    if (world && task && opened && !openWorlds.some(item => item.id === world.id)) {
      openWorlds.push({ id: world.id, name: world.name, openedAt: opened.openAt.toISOString() })
    }
    const scope = world?.vote_scope ?? 'all'
    const eligible = viewer && (viewer.role === 'architect' || scope === 'all' ||
      (scope === 'self' && viewer.id === world?.discoverer_id) || (scope === 'voters' && viewer.role === 'voyager'))
    if (task && viewer && eligible && !responded.has(task.id)) {
      awaitingYou++
      if (thread.world_id) awaitingWorldIds.push(thread.world_id)
    }
  }
  const counts = new Map<string, number>()
  for (const response of input.roundResponses) counts.set(response.task_id, (counts.get(response.task_id) ?? 0) + 1)
  for (const round of latestDispatchRounds(input.rounds, input.tasks)) {
    const world = worlds.get(round.world_id)
    if (!world || !round.task_id) continue
    const access = roundVoteAccess({ status: world.lifecycle_state === 'syncing' ? round.status : 'cancelled',
      openedAt: round.opened_at, closesAt: round.closes_at, participantCount: counts.get(round.task_id) ?? 0,
      initiatorId: round.initiator_id, discovererId: world.discoverer_id, voteScope: world.vote_scope, viewer, now: input.now })
    if (access.publicOpen && round.opened_at) openWorlds.push({ id: world.id, name: world.name, openedAt: round.opened_at })
    if (access.canVote && !responded.has(round.task_id)) { awaitingYou++; awaitingWorldIds.push(world.id) }
  }
  return { openWorlds, awaitingWorldIds, awaitingYou }
}
