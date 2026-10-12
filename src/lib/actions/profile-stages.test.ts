import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ user: { id: 'member' } as { id: string } | null, access: 'applicant', accessError: null as string | null, bound: false, bindingError: null as string | null, rpc: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/loops', () => ({ upsertLoopsContact: vi.fn() }))
vi.mock('@/lib/member-visibility', () => ({ visibleMemberProfiles: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) }, rpc: async () => ({ data: state.access, error: state.accessError }) }),
  createAdminClient: () => ({ rpc: state.rpc }),
}))
import { getMyProfileStages } from './profile'
beforeEach(() => { state.user = { id: 'member' }; state.access = 'applicant'; state.accessError = null; state.bound = false; state.bindingError = null; state.rpc.mockReset().mockImplementation(async () => ({ data: state.bound, error: state.bindingError })) })
it.each(['applicant', 'voyager', 'architect'])('uses authoritative %s access, never the profile role', async access => {
  state.access = access
  expect(await getMyProfileStages()).toEqual({ consoleBound: false, accessRole: access })
  expect(state.rpc).toHaveBeenCalledWith('has_bound_console', { p_user: 'member' })
})
it('keeps physical binding separate from digital membership', async () => {
  state.bound = true
  expect(await getMyProfileStages()).toEqual({ consoleBound: true, accessRole: 'applicant' })
})
it.each(['access', 'binding', 'invalid'])('rejects an unverified %s result', async failure => {
  if (failure === 'access') state.accessError = 'unavailable'
  if (failure === 'binding') state.bindingError = 'unavailable'
  if (failure === 'invalid') state.access = 'unknown'
  await expect(getMyProfileStages()).rejects.toThrow('could not be loaded')
})
it('does not query privileged membership data for guests', async () => {
  state.user = null
  expect(await getMyProfileStages()).toEqual({ consoleBound: false, accessRole: 'guest' })
  expect(state.rpc).not.toHaveBeenCalled()
})
