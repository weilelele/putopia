import { describe, expect, it } from 'vitest'
import { analyticsEventId, deliveryCounts, MARKETING_BROADCASTS, verifiedPaidOrder } from './marketing-analytics'

describe('marketing analytics reconciliation', () => {
  it('uses a unique explicit production allowlist', () => {
    expect(new Set(MARKETING_BROADCASTS.map(b => b.id)).size).toBe(7)
  })
  it('deduplicates each order with a stable UUID', () => {
    expect(analyticsEventId('one')).toBe(analyticsEventId('one'))
    expect(analyticsEventId('one')).not.toBe(analyticsEventId('two'))
    expect(analyticsEventId('one')).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/)
  })
  it('does not silently turn missing delivery data into zero', () => {
    expect(() => deliveryCounts({ sent: 5 })).toThrow()
    expect(deliveryCounts({ sent: 5, delivered: 5, bounced: 0, unsubscribed: 0 }).sent).toBe(5)
    expect(() => deliveryCounts({ sent: -1, delivered: 0, bounced: 0, unsubscribed: 0 })).toThrow()
  })
  const order = { id: 'order', user_id: 'user', amount: 100, currency: 'usd', paid_at: '2026-09-29T00:00:00Z', stripe_session_id: 'cs_live_example', device_batch_slug: 'kyoto' }
  const session = { id: 'cs_live_example', livemode: true, payment_status: 'paid', amount_total: 100, currency: 'usd' }
  it('only counts matched live paid sessions with an identified user', () => {
    expect(verifiedPaidOrder(order, session)).toBe(true)
    expect(verifiedPaidOrder(order, { ...session, livemode: false })).toBe(false)
    expect(verifiedPaidOrder(order, { ...session, payment_status: 'unpaid' })).toBe(false)
    expect(verifiedPaidOrder(order, { ...session, id: 'another' })).toBe(false)
    expect(verifiedPaidOrder(order, { ...session, amount_total: 99 })).toBe(false)
    expect(verifiedPaidOrder(order, { ...session, currency: 'eur' })).toBe(false)
    expect(verifiedPaidOrder({ ...order, user_id: null }, session)).toBe(false)
    expect(verifiedPaidOrder({ ...order, paid_at: 'invalid' }, session)).toBe(false)
  })
})
