import { describe, expect, it, vi } from 'vitest'
import { ORDER_EXPIRY_MS, isOrderOverdue, releaseOverdueOrder, type ExpiryOrder, type ExpirySession } from './order-expiry'

const now = Date.parse('2026-09-16T12:00:00Z')
const order: ExpiryOrder = {
  id: 'order-1', status: 'pending', created_at: new Date(now - ORDER_EXPIRY_MS).toISOString(),
  paid_at: null, stripe_session_id: 'session-1', stripe_payment_intent: null,
}
const expired: ExpirySession = { id: 'session-1', status: 'expired', payment_status: 'unpaid', payment_intent: null, order_id: order.id }
function dependencies(session = expired) {
  return {
    retrieveSession: vi.fn().mockResolvedValue(session),
    expireSession: vi.fn().mockResolvedValue(expired),
    paymentIntentStatus: vi.fn().mockResolvedValue('canceled'),
    cancelOrder: vi.fn().mockResolvedValue(true),
  }
}

describe('48-hour order expiration', () => {
  it('starts at exactly 48 hours and rejects invalid dates', () => {
    expect(isOrderOverdue(order, now - 1)).toBe(false)
    expect(isOrderOverdue(order, now)).toBe(true)
    expect(isOrderOverdue({ ...order, created_at: 'invalid' }, now)).toBe(false)
  })
  it.each(['paid', 'payment_review', 'payment_failed', 'preparing', 'shipped', 'delivered', 'refunded', 'canceled'])('protects %s orders without calling Stripe', async (status) => {
    const deps = dependencies()
    expect(await releaseOverdueOrder({ ...order, status }, deps, now)).toBe('protected')
    expect(deps.retrieveSession).not.toHaveBeenCalled()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })
  it('protects payment evidence even on pending rows', async () => {
    for (const overrides of [{ paid_at: new Date(now).toISOString() }, { stripe_payment_intent: 'pi-paid' }]) {
      const deps = dependencies()
      expect(await releaseOverdueOrder({ ...order, ...overrides }, deps, now)).toBe('protected')
      expect(deps.cancelOrder).not.toHaveBeenCalled()
    }
  })
  it('releases an expired unpaid checkout using a conditional write', async () => {
    const deps = dependencies()
    expect(await releaseOverdueOrder(order, deps, now)).toBe('released')
    expect(deps.cancelOrder).toHaveBeenCalledWith(order, order.created_at)
  })
  it('closes an open checkout before releasing its inventory', async () => {
    const deps = dependencies({ ...expired, status: 'open' })
    expect(await releaseOverdueOrder(order, deps, now)).toBe('released')
    expect(deps.expireSession).toHaveBeenCalledWith('session-1')
    expect(deps.expireSession.mock.invocationCallOrder[0]).toBeLessThan(deps.cancelOrder.mock.invocationCallOrder[0])
  })
  it.each([
    { status: 'complete', payment_status: 'paid' },
    { status: 'complete', payment_status: 'unpaid' },
    { status: 'expired', payment_status: 'no_payment_required' },
  ])('protects completed or paid Stripe checkouts: %j', async (fields) => {
    const deps = dependencies({ ...expired, ...fields })
    expect(await releaseOverdueOrder(order, deps, now)).toBe('protected')
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })
  it('preserves inventory when payment wins the expiration race', async () => {
    const deps = dependencies({ ...expired, status: 'open' })
    deps.expireSession.mockRejectedValue(new Error('Session already complete'))
    await expect(releaseOverdueOrder(order, deps, now)).rejects.toThrow()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })
  it('preserves inventory on Stripe outage or unknown session', async () => {
    const deps = dependencies()
    deps.retrieveSession.mockRejectedValue(new Error('Not available'))
    await expect(releaseOverdueOrder(order, deps, now)).rejects.toThrow()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })
  it('rejects a mismatched session', async () => {
    const deps = dependencies({ ...expired, order_id: 'different-order' })
    await expect(releaseOverdueOrder(order, deps, now)).rejects.toThrow('does not match')
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })
  it.each(['processing', 'succeeded', 'requires_capture', 'requires_action'])('protects a %s payment intent', async (status) => {
    const deps = dependencies({ ...expired, payment_intent: 'pi-1' })
    deps.paymentIntentStatus.mockResolvedValue(status)
    expect(await releaseOverdueOrder(order, deps, now)).toBe('protected')
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })
  it('releases an abandoned order without a session', async () => {
    const deps = dependencies()
    expect(await releaseOverdueOrder({ ...order, stripe_session_id: null }, deps, now)).toBe('released')
    expect(deps.retrieveSession).not.toHaveBeenCalled()
  })
  it('does not count a release twice or overwrite a concurrent payment', async () => {
    const deps = dependencies()
    deps.cancelOrder.mockResolvedValue(false)
    expect(await releaseOverdueOrder(order, deps, now)).toBe('unchanged')
  })
})
