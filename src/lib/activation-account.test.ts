import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ createUser: vi.fn(), from: vi.fn(), listUsers: vi.fn(), rpc: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ auth: { admin: { createUser: mocks.createUser, listUsers: mocks.listUsers } }, from: mocks.from, rpc: mocks.rpc }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
import { createUnactivatedAccount, findAccount } from './activation'

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
    mocks.rpc.mockResolvedValue({ data: [{ id: 'race-winner', activated: false }], error: null })
    expect(await createUnactivatedAccount('fixture@example.com', 'initiation_email_checkout')).toEqual({ id: 'race-winner', activated: false, created: false })
    expect(mocks.listUsers).not.toHaveBeenCalled()
  })
  it('keeps a failed creation from progressing into checkout', async () => {
    mocks.createUser.mockResolvedValue({ error: new Error('auth unavailable') })
    await expect(createUnactivatedAccount('fixture@example.com', 'initiation_email_checkout')).rejects.toThrow('auth unavailable')
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

describe('bounded account lookup', () => {
  it.each([true, false])('returns the authoritative activation state %s without enumerating Auth', async activated => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'existing', activated }], error: null })
    expect(await findAccount('  Buyer@EXAMPLE.COM ')).toEqual({ id: 'existing', activated })
    expect(mocks.rpc).toHaveBeenCalledWith('find_activation_account', { p_email: 'buyer@example.com' })
    expect(mocks.listUsers).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('only treats a successful empty lookup as a new email', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    expect(await findAccount('new@example.com')).toBeNull()
  })
  it.each([null, [{ id: 'one', activated: false }, { id: 'two', activated: true }], [{ id: 'one' }]])('fails closed on malformed or ambiguous records', async data => {
    mocks.rpc.mockResolvedValue({ data, error: null })
    await expect(findAccount('fixture@example.com')).rejects.toThrow()
    expect(mocks.createUser).not.toHaveBeenCalled()
  })
  it('does not turn a database error into permission to create an account', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('lookup failed') })
    await expect(findAccount('fixture@example.com')).rejects.toThrow('lookup failed')
  })
})
