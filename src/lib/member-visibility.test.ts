import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ rows: [] as { user_id: string }[], error: null as string | null, query: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: () => ({ select: () => ({ in: state.query }) }) }) }))
import { visibleMemberProfiles } from './member-visibility'
beforeEach(() => { state.rows = []; state.error = null; state.query.mockReset().mockImplementation(async () => ({ data: state.rows, error: state.error })) })
it('hides deletion shells without excluding ordinary members or NPCs', async () => {
  state.rows = [{ user_id: 'deleted' }]
  expect(await visibleMemberProfiles([{ id: 'human' }, { id: 'deleted' }, { id: 'npc' }])).toEqual([{ id: 'human' }, { id: 'npc' }])
})
it('fails closed when deletion visibility cannot be verified', async () => {
  state.error = 'unavailable'
  await expect(visibleMemberProfiles([{ id: 'deleted' }])).rejects.toThrow('visibility')
})
it('does not query an empty roster', async () => {
  expect(await visibleMemberProfiles([])).toEqual([])
  expect(state.query).not.toHaveBeenCalled()
})
