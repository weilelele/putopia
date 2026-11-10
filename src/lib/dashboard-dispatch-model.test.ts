import { describe, expect, it } from 'vitest'
import { dashboardDispatch, type DispatchWorld, type DispatchRound, type DispatchTask } from './dashboard-dispatch-model'

const opened = '2026-10-29T00:00:00.000Z'
const now = Date.parse('2026-10-29T12:00:00.000Z')
const viewer = { id: 'member', role: 'voyager' }
const world: DispatchWorld = { id: 'world', name: 'World', discoverer_id: 'owner', vote_scope: 'all', scan_until: opened, lifecycle_state: 'syncing' }
const task: DispatchTask = { id: 'task', thread_id: 'thread', day_index: 0, published_at: opened, dreamcatcher_round_id: null }
const round: DispatchRound = { id: 'round', world_id: world.id, task_id: task.id, round_number: 1, status: 'voting_open', initiator_id: 'initiator', opened_at: opened, closes_at: '2026-10-30T00:00:00.000Z' }
function legacy(overrides: Partial<Parameters<typeof dashboardDispatch>[0]> = {}) {
  return dashboardDispatch({ tasks: [task], threads: [{ id: 'thread', world_id: world.id, reveal_anchor_at: null, gap_hours: 4 }],
    worlds: [world], rounds: [], responded: [], roundResponses: [], viewer, now, ...overrides })
}
function rounds(overrides: Partial<Parameters<typeof dashboardDispatch>[0]> = {}) {
  return legacy({ threads: [], tasks: [{ ...task, dreamcatcher_round_id: round.id }], rounds: [round], ...overrides })
}

describe('Dashboard dispatch eligibility without investigation history', () => {
  it('keeps public event cards for guests and answered viewers, without counting an unanswered signal', () => {
    expect(legacy({ viewer: null })).toMatchObject({ openWorlds: [{ id: world.id, openedAt: opened }], awaitingYou: 0 })
    expect(legacy({ responded: [task.id] })).toMatchObject({ openWorlds: [{ id: world.id }], awaitingYou: 0 })
    expect(legacy()).toMatchObject({ awaitingYou: 1, awaitingWorldIds: [world.id] })
  })
  it.each([
    ['self', 'member', 'voyager', 0], ['self', 'owner', 'applicant', 1],
    ['voters', 'member', 'applicant', 0], ['voters', 'member', 'voyager', 1],
    ['self', 'member', 'architect', 1], ['all', 'member', 'applicant', 1],
  ])('preserves %s voting scope for %s / %s', (scope, id, role, expected) => {
    const input = { worlds: [{ ...world, vote_scope: scope }], viewer: { id, role } }
    expect(legacy(input).awaitingYou).toBe(expected)
    expect(rounds(input).awaitingYou).toBe(expected)
  })
  it('computes the current time on every read, including exact closing/gap/open boundaries', () => {
    const tasks = [task, { ...task, id: 'next', day_index: 1 }]
    expect(legacy({ tasks, now: Date.parse('2026-10-30T00:00:00Z') }).openWorlds).toEqual([])
    expect(legacy({ tasks, now: Date.parse('2026-10-30T04:00:00Z') })).toMatchObject({ awaitingYou: 1, openWorlds: [{ openedAt: '2026-10-30T04:00:00.000Z' }] })
    expect(legacy({ tasks, now: Date.parse('2026-10-28T23:59:59Z') }).awaitingYou).toBe(0)
  })
  it('requires the published contiguous schedule and respects a delayed publication', () => {
    expect(legacy({ tasks: [{ ...task, day_index: 1 }] }).openWorlds).toEqual([])
    expect(legacy({ tasks: [{ ...task, published_at: '2026-10-30T10:00:00Z' }] }).openWorlds).toEqual([])
  })
  it('shows a round publicly before its deadline, including to ineligible viewers', () => {
    expect(rounds({ viewer: null })).toMatchObject({ openWorlds: [{ id: world.id }], awaitingYou: 0 })
    expect(rounds({ responded: [task.id] }).awaitingYou).toBe(0)
  })
  it('keeps expired empty rounds available only to their initiator', () => {
    const after = Date.parse(round.closes_at!)
    expect(rounds({ now: after })).toMatchObject({ openWorlds: [], awaitingYou: 0 })
    expect(rounds({ now: after, viewer: { id: 'initiator', role: 'applicant' } })).toMatchObject({ openWorlds: [], awaitingYou: 1 })
    expect(rounds({ now: after, viewer: { id: 'initiator', role: 'applicant' }, roundResponses: [{ task_id: task.id }] }).awaitingYou).toBe(0)
  })
  it('never revives an older open round after a later published round settles', () => {
    const next = { ...task, id: 'next', dreamcatcher_round_id: 'second' }
    expect(rounds({ tasks: [{ ...task, dreamcatcher_round_id: round.id }, next], rounds: [round, { ...round, id: 'second', task_id: next.id, round_number: 2, status: 'settled' }] }))
      .toMatchObject({ openWorlds: [], awaitingYou: 0 })
  })
  it('ignores unpublished round tasks and worlds which have left syncing', () => {
    expect(rounds({ tasks: [] }).awaitingYou).toBe(0)
    expect(rounds({ worlds: [{ ...world, lifecycle_state: 'established' }] })).toMatchObject({ openWorlds: [], awaitingYou: 0 })
  })
})
