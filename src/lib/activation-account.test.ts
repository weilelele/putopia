import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  createUser: vi.fn(), from: vi.fn(), listUsers: vi.fn(), rpc: vi.fn(), getUserById: vi.fn(), updateUserById: vi.fn(),
}))
const token = vi.hoisted(() => ({ verify: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ auth: { admin: { createUser: mocks.createUser, listUsers: mocks.listUsers, getUserById: mocks.getUserById, updateUserById: mocks.updateUserById } }, from: mocks.from, rpc: mocks.rpc }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/activation-link', async (importOriginal) => ({
  ...await importOriginal<typeof import('./activation-link')>(),
  verifyActivationToken: token.verify,
}))
import { activationStatus, completeActivation, createUnactivatedAccount, findAccount } from './activation'

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

describe('registration failure codes', () => {
  const complete = () => completeActivation('signed-fixture', 'Fixture', 'fixture-password')
  const unregistered = { data: { registered_at: null }, error: null }
  const user = { id: 'fixture', email: 'fixture@example.com', user_metadata: {} }
  const maybeSingle = vi.fn()
  const profile = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle,
  }

  beforeEach(() => {
    vi.stubEnv('ACTIVATION_LINK_SECRET', 'fixture-secret')
    token.verify.mockReturnValue({ userId: user.id, expiresAt: Infinity, next: null })
    mocks.getUserById.mockResolvedValue({ data: { user }, error: null })
    mocks.updateUserById.mockResolvedValue({ error: null })
    profile.select.mockReturnThis()
    profile.update.mockReturnThis()
    profile.eq.mockReturnThis()
    profile.is.mockReturnThis()
    mocks.from.mockReturnValue(profile)
    maybeSingle.mockReset().mockResolvedValueOnce(unregistered)
  })

  afterEach(() => vi.unstubAllEnvs())

  it('distinguishes a malformed link from a signed expired link', async () => {
    token.verify.mockReturnValueOnce(null)
    await expect(activationStatus('invalid')).resolves.toEqual({ status: 'expired', errorCode: 'link_invalid' })
    token.verify.mockReturnValue({ userId: user.id, expiresAt: 0, next: null })
    await expect(activationStatus('expired')).resolves.toEqual({ status: 'expired', errorCode: 'link_expired' })
    await expect(complete()).resolves.toMatchObject({ ok: false, reason: 'expired', errorCode: 'link_expired' })
    expect(mocks.updateUserById).not.toHaveBeenCalled()
  })

  it('keeps an Auth rejection in password setup and skips the profile write', async () => {
    mocks.updateUserById.mockResolvedValue({ error: { message: 'Auth rejected update' } })
    await expect(complete()).resolves.toMatchObject({ ok: false, errorCode: 'password_update_failed' })
    expect(profile.update).not.toHaveBeenCalled()
  })

  it('keeps a rejected profile request in the profile save stage', async () => {
    maybeSingle.mockRejectedValueOnce(new Error('Profile request failed'))
    await expect(complete()).resolves.toMatchObject({ ok: false, errorCode: 'profile_write_failed' })
  })

  it('reports a zero-row update when the profile still has no registration', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce(unregistered)
    await expect(complete()).resolves.toMatchObject({ ok: false, errorCode: 'profile_not_saved' })
  })

  it('accepts a zero-row update when another request already saved the profile', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { registered_at: '2026-11-01T00:00:00Z' }, error: null })
    await expect(complete()).resolves.toMatchObject({ ok: true })
  })
})
