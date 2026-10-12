import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture } from '@/app/dev/voyager-initiation/fixtures'
const { getSnapshot } = vi.hoisted(() => ({ getSnapshot: vi.fn() }))
vi.mock('@/lib/actions/initiation', () => ({ getInitiationSnapshot: getSnapshot }))
import { beginVoyagerInitiation } from './actions'

describe('Voyager Initiation server preflight', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires a verified account', async () => {
    getSnapshot.mockResolvedValue(fixture('guest'))
    expect((await beginVoyagerInitiation()).status).toBe('unauthenticated')
  })
  it('requires server-saved calibration', async () => {
    getSnapshot.mockResolvedValue(fixture('unpaid'))
    expect((await beginVoyagerInitiation()).status).toBe('calibration_required')
  })
  it.each(['initiated', 'unknown', 'sold_out'] as const)('does not send %s into checkout', async state => {
    getSnapshot.mockResolvedValue(fixture(state))
    expect((await beginVoyagerInitiation()).status).toBe('not_open')
  })
  it('allows calibrated legacy members to use explicitly enabled upgrade checkout', async () => {
    const state = fixture('legacy_pack')
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
  it('does not treat a failed lookup as completion', async () => {
    getSnapshot.mockRejectedValue(new Error('lookup failed'))
    await expect(beginVoyagerInitiation()).rejects.toThrow('lookup failed')
  })
})
