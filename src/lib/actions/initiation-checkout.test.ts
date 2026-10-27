import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), rpc: vi.fn(), config: vi.fn(),
  records: {} as Record<string, unknown>, failed: '' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/initiation-config', () => ({ initiationConfigurationError: mocks.config }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }))
import { getInitiationCheckoutSnapshot } from './initiation'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.failed = ''
  mocks.records = { initiation_availability: { open: true, capacity: 100, initiated: 20, remaining: 80, paid: 20, granted: 0 } }
  mocks.config.mockReturnValue(null)
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-buyer' } }, error: null })
  const record = (name: string) => ({ data: mocks.records[name] ?? null, error: mocks.failed === name ? { code: 'unavailable' } : null })
  mocks.rpc.mockImplementation(async name => record(name))
  mocks.from.mockImplementation(name => ({ select: () => ({ eq: (field: string, value: string) => {
    expect([field, value]).toEqual(['user_id', 'verified-buyer'])
    return { maybeSingle: async () => record(name) }
  } }) }))
})
describe('minimal checkout preflight', () => {
  it('does not load shipment history, calibration, profiles or device details before payment', async () => {
    expect(await getInitiationCheckoutSnapshot()).toMatchObject({ userId: 'verified-buyer', status: 'unpaid', availability: { checkoutOpen: true } })
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['initiation_entitlements', 'initiation_members'])
    expect(mocks.rpc.mock.calls.slice(1)).toEqual([
      ['eligible_initial_initiation_order', { p_user: 'verified-buyer' }], ['eligible_legacy_initiation_order', { p_user: 'verified-buyer' }],
    ])
  })
  it('does not query privileged records for a guest or failed authentication', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await getInitiationCheckoutSnapshot()).status).toBe('guest')
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'unverified' } }, error: new Error('auth failed') })
    expect((await getInitiationCheckoutSnapshot()).status).toBe('unknown')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each(['initiation_availability', 'initiation_entitlements', 'initiation_members', 'eligible_initial_initiation_order', 'eligible_legacy_initiation_order'])('fails closed when %s is unavailable', async table => {
    mocks.failed = table
    expect(await getInitiationCheckoutSnapshot()).toMatchObject({ status: 'unknown', availability: { checkoutOpen: false } })
  })
  it.each(['initial', 'legacy'])('lets a verified %s owner upgrade a full batch using their existing seat', async type => {
    mocks.records.initiation_availability = { open: true, capacity: 100, initiated: 100, remaining: 0, paid: 100, granted: 0 }
    mocks.records.initiation_members = { source: 'paid', active: true, batch: 'S26' }
    mocks.records[`eligible_${type}_initiation_order`] = 'paid-initial'
    expect(await getInitiationCheckoutSnapshot()).toMatchObject({ status: 'legacy_pack', availability: { checkoutOpen: true } })
    expect(mocks.config).toHaveBeenCalledWith('legacy_upgrade')
  })
  it.each([
    { source: 'granted', active: true, status: 'granted' }, { source: 'paid', active: true, status: 'unknown' },
  ])('keeps roster $status records out of checkout', async member => {
    mocks.records.initiation_members = { ...member, batch: 'S26' }
    expect(await getInitiationCheckoutSnapshot()).toMatchObject({ status: member.status, availability: { checkoutOpen: false } })
  })
  it.each([true, false])('preserves an existing entitlement even when active=%s', async active => {
    mocks.records.initiation_entitlements = { active }
    expect(await getInitiationCheckoutSnapshot()).toMatchObject({ status: active ? 'initiated' : 'unpaid', availability: { checkoutOpen: false } })
  })
  it.each(['closed', 'full', 'malformed', 'configuration'])('rejects %s checkout', async failure => {
    if (failure === 'closed') mocks.records.initiation_availability = { ...mocks.records.initiation_availability as object, open: false }
    if (failure === 'full') mocks.records.initiation_availability = { open: true, capacity: 100, initiated: 100, remaining: 0, paid: 100, granted: 0 }
    if (failure === 'malformed') mocks.records.initiation_availability = { remaining: 80 }
    if (failure === 'configuration') mocks.config.mockReturnValue('Checkout is not configured')
    expect((await getInitiationCheckoutSnapshot()).availability.checkoutOpen).toBe(false)
  })
})
