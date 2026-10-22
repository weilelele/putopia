import { describe, expect, it } from 'vitest'
import type { SupabaseClient, UserResponse } from '@supabase/supabase-js'
import { hideAnonymousUser, isAnonymousUser } from './anonymous'

function clientReturning(user: { id: string; is_anonymous?: boolean }) {
  return { auth: { getUser: async () => ({ data: { user }, error: null }) as unknown as UserResponse } } as unknown as Pick<SupabaseClient, 'auth'>
}

describe('anonymous checkout sessions', () => {
  it('recognises only an explicit anonymous user', () => {
    expect(isAnonymousUser({ is_anonymous: true })).toBe(true)
    expect(isAnonymousUser({ is_anonymous: false })).toBe(false)
    expect(isAnonymousUser({})).toBe(false)
    expect(isAnonymousUser(null)).toBe(false)
  })

  it('reports an anonymous session as a missing session', async () => {
    const { data, error } = await hideAnonymousUser(clientReturning({ id: 'anon', is_anonymous: true })).auth.getUser()
    expect(data.user).toBeNull()
    expect(error?.name).toBe('AuthSessionMissingError')
  })

  it('passes registered users through unchanged', async () => {
    const { data } = await hideAnonymousUser(clientReturning({ id: 'member', is_anonymous: false })).auth.getUser()
    expect(data.user?.id).toBe('member')
  })
})
