import { describe, expect, it } from 'vitest'
import { getDevicePurchaseEvent } from './device-purchase-event'

const order = { id: 'order-1', status: 'paid', amount: 52000, currency: 'usd', device_batch_slug: 'kyoto-one' }

describe('device Purchase conversion', () => {
  it('reports $520, not 52000, with a stable order-based event ID', () => {
    expect(getDevicePurchaseEvent(order)).toEqual({ eventId: 'device_purchase_order-1', value: 520, currency: 'USD', contentId: 'kyoto-one' })
  })
  it('does not report unverified or unsuccessful orders', () => {
    expect(getDevicePurchaseEvent(null)).toBeNull()
    for (const status of ['pending', 'payment_review', 'canceled', 'refunded', 'failed']) {
      expect(getDevicePurchaseEvent({ ...order, status })).toBeNull()
    }
  })
  it('preserves the event ID as fulfillment advances', () => {
    for (const status of ['preparing', 'shipped', 'delivered']) {
      expect(getDevicePurchaseEvent({ ...order, status })).toEqual(getDevicePurchaseEvent(order))
    }
  })
  it('handles zero-decimal currencies and rejects malformed payment amounts', () => {
    expect(getDevicePurchaseEvent({ ...order, currency: 'jpy' })?.value).toBe(52000)
    for (const amount of [null, 0, -1, NaN, 1.5]) expect(getDevicePurchaseEvent({ ...order, amount })).toBeNull()
    expect(getDevicePurchaseEvent({ ...order, currency: 'invalid' })).toBeNull()
  })
})
