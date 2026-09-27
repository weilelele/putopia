import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), resolve: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc: state.rpc }) }))
vi.mock('@/lib/email', () => ({ sendEmail: state.send }))
vi.mock('./world-confirmed-email', () => ({ resolveUserEmail: state.resolve }))
import { sendDreamcatcherNotifications } from './dreamcatcher-notifications'
import { buildDreamcatcherEmail } from './dreamcatcher-email'
const notice = { roundId: 'round', initiatorId: 'original', worldId: 'world', worldName: '<Dream>', roundNumber: 2, leaseToken: 'lease', closesAt: '2099-01-02T00:00:00Z' }
beforeEach(() => {
  vi.resetAllMocks()
  state.rpc.mockResolvedValue({ data: null, error: null })
  state.resolve.mockResolvedValue('owner@example.invalid')
  state.send.mockResolvedValue({ id: 'provider-id', error: null })
})
describe('only notify the original submitter when a round is published', () => {
  it('does not email when no eligible publication exists', async () => {
    expect(await sendDreamcatcherNotifications()).toEqual({ sent: 0, failed: 0 })
    expect(state.send).not.toHaveBeenCalled()
  })
  it('resolves only the immutable initiator and uses one stable provider key per round', async () => {
    state.rpc.mockResolvedValueOnce({ data: notice, error: null })
    expect(await sendDreamcatcherNotifications()).toEqual({ sent: 1, failed: 0 })
    expect(state.resolve.mock.calls[0][1]).toBe('original')
    expect(state.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: 'owner@example.invalid', idempotencyKey: 'dreamcatcher-ready/round' }))
    expect(state.rpc).toHaveBeenCalledWith('finish_dreamcatcher_notification', expect.objectContaining({ p_round: 'round', p_lease: 'lease', p_provider: 'provider-id', p_error: null }))
  })
  it('records failure instead of falsely marking an undelivered email sent', async () => {
    state.rpc.mockResolvedValueOnce({ data: notice, error: null })
    state.send.mockResolvedValue({ error: 'Resend unavailable' })
    expect(await sendDreamcatcherNotifications()).toEqual({ sent: 0, failed: 1 })
    expect(state.rpc).toHaveBeenCalledWith('finish_dreamcatcher_notification', expect.objectContaining({ p_error: 'Resend unavailable' }))
  })
  it('escapes world names and produces a result link without leaking unpublished media', () => {
    const copy = buildDreamcatcherEmail({ ...notice, siteUrl: 'https://example.com' })
    expect(copy.html).toContain('&lt;Dream&gt;')
    expect(copy.html).not.toContain('<Dream>')
    expect(copy.text).toContain('https://example.com/worlds/world')
    expect(copy.html).not.toContain('<img')
    const branded = buildDreamcatcherEmail({ ...notice, arrayName: 'London Dreamcatcher', siteUrl: 'https://example.com' })
    expect(branded.text).toContain('The London Parallax Array has received')
    expect(branded.subject).toBe('A new signal from your world — Round 2')
    expect(branded.html).not.toContain('Dreamcatcher')
  })
})
