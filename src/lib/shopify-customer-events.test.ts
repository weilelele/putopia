import { describe, expect, it } from 'vitest'
import { parseShopifyCustomerEvent, shopifyCheckoutStages } from './shopify-customer-events'

const now = Date.parse('2026-11-18T00:00:00Z')
const reference = '82500000-0000-4000-8000-000000000001.' + 'a'.repeat(64)
const input = { reference, event: 'checkout_started', timestamp: '2026-11-18T00:00:00Z' }
describe('Shopify customer event boundary', () => {
  it.each(Object.keys(shopifyCheckoutStages))('accepts only the mapped stage %s', event => {
    expect(parseShopifyCustomerEvent({ ...input, event }, now)?.event).toBe(shopifyCheckoutStages[event as keyof typeof shopifyCheckoutStages])
  })
  it('drops all personal fields and checkout tokens from the received event', () => {
    expect(parseShopifyCustomerEvent({ ...input, email: 'never@example.com', token: 'private', address: 'private' }, now))
      .toEqual({ reference, orderId: input.reference.slice(0, 36), event: 'initiation_checkout_viewed', timestamp: '2026-11-18T00:00:00.000Z' })
  })
  it('keeps checkout completed separate from verified purchase', () => {
    expect(parseShopifyCustomerEvent({ ...input, event: 'checkout_completed' }, now)?.event).toBe('initiation_checkout_completed_viewed')
    expect(parseShopifyCustomerEvent({ ...input, event: 'initiation_purchase_completed' }, now)).toBeNull()
  })
  it.each([{ reference: 'forged' }, { event: 'Purchase' }, { timestamp: 'invalid' },
    { timestamp: '2026-11-18T00:02:00Z' }, { timestamp: '2026-11-16T00:00:00Z' }])('rejects invalid or stale input %j', patch => {
    expect(parseShopifyCustomerEvent({ ...input, ...patch }, now)).toBeNull()
  })
})
