import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ events: [] as string[], visibilityError: null as string | null, deleteError: null as string | null }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/loops', () => ({ deleteLoopsContact: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'member' } } }), signOut: async () => { state.events.push('signout') } } }),
  createAdminClient: () => ({
    from: (table: string) => ({
      upsert: async () => { state.events.push(`hide:${table}`); return { error: state.visibilityError } },
      select: () => ({ eq: () => ({ data: [], maybeSingle: async () => ({ data: { role: 'voyager' } }) }) }),
      delete: () => ({ eq: async () => { state.events.push(`delete:${table}`); return {} } }),
      update: () => ({ eq: async () => { state.events.push(`scrub:${table}`); return {} } }),
    }),
    storage: { from: () => ({ list: async () => ({ data: [] }) }) },
    auth: { admin: {
      deleteUser: async () => { state.events.push('delete:auth'); return { error: state.deleteError ? { message: state.deleteError } : null } },
      updateUserById: async () => { state.events.push('ban:auth'); return {} },
    } },
  }),
}))
import { deleteMyAccount } from './account-deletion'
beforeEach(() => { state.events = []; state.visibilityError = null; state.deleteError = null })
it('stops before destructive cleanup if the visibility marker cannot be saved', async () => {
  state.visibilityError = 'unavailable'
  expect((await deleteMyAccount('DELETE')).error).toContain('could not be started')
  expect(state.events).toEqual(['hide:account_deletions'])
})
it('hides a retained membership shell before scrubbing it, without changing entitlements or seats', async () => {
  state.deleteError = 'retained member foreign key'
  expect(await deleteMyAccount('DELETE')).toEqual({ error: null })
  expect(state.events).toEqual(['hide:account_deletions', 'delete:world_reports', 'delete:auth', 'scrub:voyager_profiles', 'ban:auth', 'signout'])
})
it('preserves normal hard deletion', async () => {
  expect(await deleteMyAccount('DELETE')).toEqual({ error: null })
  expect(state.events).toEqual(['hide:account_deletions', 'delete:world_reports', 'delete:auth', 'signout'])
})
