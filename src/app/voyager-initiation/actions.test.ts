import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture } from '@/app/dev/voyager-initiation/fixtures'
const { getSnapshot } = vi.hoisted(() => ({ getSnapshot: vi.fn() }))
vi.mock('@/lib/actions/initiation', () => ({ getInitiationCheckoutSnapshot: getSnapshot }))
import { beginVoyagerInitiation } from './actions'

describe('Voyager Initiation server preflight', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires a verified account', async () => {
    getSnapshot.mockResolvedValue(fixture('guest'))
    expect((await beginVoyagerInitiation()).status).toBe('unauthenticated')
  })
  it('allows checkout before completing calibration', async () => {
    const state = fixture('unpaid')
    state.availability.checkoutOpen = true
    getSnapshot.mockResolvedValue(state)
    expect(state.calibrated).toBe(false)
    expect((await beginVoyagerInitiation()).status).toBe('ready')
  })
  it.each(['initiated', 'unknown', 'sold_out'] as const)('does not send %s into checkout', async state => {
    getSnapshot.mockResolvedValue(fixture(state))
    expect((await beginVoyagerInitiation()).status).toBe('not_open')
  })
  it('allows legacy members to upgrade without calibration', async () => {
    const state = fixture('legacy_pack')
    state.calibrated = false
    state.availability.checkoutOpen = true
    getSnapshot.mockResolvedValue(state)
    expect((await beginVoyagerInitiation()).status).toBe('ready')
  })
  it('never sends a registered grant into calibration or payment', async () => {
    getSnapshot.mockResolvedValue({ ...fixture('unpaid'), status: 'granted', membershipSource: 'granted' })
    const result = await beginVoyagerInitiation()
    expect(result.status).toBe('not_open')
    expect(result.message).toContain('already registered')
  })
  it('requires an explicitly open checkout, independent of role', async () => {
    const state = fixture('architect')
    getSnapshot.mockResolvedValue(state)
    expect((await beginVoyagerInitiation()).status).toBe('not_open')
    state.availability.checkoutOpen = true
    expect((await beginVoyagerInitiation()).status).toBe('ready')
  })
  it.each(['initiated', 'legacy_pack', 'unpaid'] as const)('reports the %s account status for a guest who just signed in', async state => {
    getSnapshot.mockResolvedValue(fixture(state))
    expect((await beginVoyagerInitiation()).accountStatus).toBe(state)
  })
  it('does not treat a failed lookup as completion', async () => {
    getSnapshot.mockRejectedValue(new Error('lookup failed'))
    await expect(beginVoyagerInitiation()).rejects.toThrow('lookup failed')
  })
})
