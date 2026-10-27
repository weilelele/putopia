import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ status: vi.fn(), complete: vi.fn(), getUser: vi.fn() }))
vi.mock('@/lib/activation', () => ({ activationStatus: mocks.status, completeActivation: mocks.complete }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
import { checkActivationLink } from './activation'

beforeEach(() => vi.resetAllMocks())

describe('reopening an activation link', () => {
  it('sends an activated account to Dashboard when a verified session exists', async () => {
    mocks.status.mockResolvedValue({ status: 'activated', next: '/voyager-initiation' })
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'signed-in-user' } }, error: null })
    expect(await checkActivationLink('signed-old-link')).toEqual({ status: 'activated', destination: '/console' })
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('requires login for an activated account without a current session, returning to Dashboard', async () => {
    mocks.status.mockResolvedValue({ status: 'activated', next: '/voyager-initiation' })
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await checkActivationLink('signed-old-link')).toEqual({ status: 'activated', destination: '/login?redirect=%2Fconsole' })
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it.each(['error', 'unavailable'])('falls back to login, not an expired screen, when session verification is %s', async failure => {
    mocks.status.mockResolvedValue({ status: 'activated', next: null })
    if (failure === 'error') mocks.getUser.mockResolvedValue({ data: { user: { id: 'unverified' } }, error: new Error('invalid session') })
    else mocks.getUser.mockRejectedValue(new Error('auth unavailable'))
    expect(await checkActivationLink('signed-old-link')).toEqual({ status: 'activated', destination: '/login?redirect=%2Fconsole' })
  })

  it.each(['ready', 'expired'] as const)('preserves %s for an unactivated account without interpreting a different viewer session', async status => {
    const result = { status, next: status === 'ready' ? '/voyager-initiation' : null }
    mocks.status.mockResolvedValue(result)
    expect(await checkActivationLink('link')).toEqual(result)
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
  })
})
