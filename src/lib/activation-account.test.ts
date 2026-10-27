import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ createUser: vi.fn(), from: vi.fn(), listUsers: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ auth: { admin: { createUser: mocks.createUser, listUsers: mocks.listUsers } }, from: mocks.from }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
import { createUnactivatedAccount } from './activation'

beforeEach(() => vi.resetAllMocks())
describe('account creation after checkout email lookup', () => {
  it('does not repeat the profile lookup or scan auth users when creating a new account', async () => {
    mocks.createUser.mockResolvedValue({ data: { user: { id: 'new-buyer' } }, error: null })
    expect(await createUnactivatedAccount('fixture@example.com', 'initiation_email_checkout')).toEqual({ id: 'new-buyer', activated: false, created: true })
    expect(mocks.createUser).toHaveBeenCalledWith({ email: 'fixture@example.com', email_confirm: false, app_metadata: { signup_source: 'initiation_email_checkout' } })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.listUsers).not.toHaveBeenCalled()
  })
  it('recovers a concurrent signup without creating a second account', async () => {
    mocks.createUser.mockResolvedValue({ error: { code: 'email_exists' } })
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: 'race-winner', registered_at: null }], error: null }) }) }) })
    expect(await createUnactivatedAccount('fixture@example.com', 'initiation_email_checkout')).toEqual({ id: 'race-winner', activated: false, created: false })
    expect(mocks.listUsers).not.toHaveBeenCalled()
  })
  it('keeps a failed creation from progressing into checkout', async () => {
    mocks.createUser.mockResolvedValue({ error: new Error('auth unavailable') })
    await expect(createUnactivatedAccount('fixture@example.com', 'initiation_email_checkout')).rejects.toThrow('auth unavailable')
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
