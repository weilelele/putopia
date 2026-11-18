import { describe, expect, it, vi } from 'vitest'
import type { InitiationAnalyticsOrder } from './initiation-analytics-outbox'
import { retryShopifyCheckoutDiagnostics, type ShopifyDiagnosticClaim, type ShopifyDiagnosticDependencies } from './shopify-checkout-diagnostics-outbox'

const id = '82500000-0000-4000-8000-000000000001'
const order: InitiationAnalyticsOrder = {
  id, user_id: 'user1', status: 'canceled', order_kind: 'membership', amount: 1200, currency: 'usd',
  pricing_version: 'voyager-membership-v1', stripe_livemode: true, stripe_session_id: null, stripe_payment_intent: null, paid_at: null,
  analytics_context: { environment: 'production', posthog_distinct_id: id, posthog_session_id: id, email: 'private@example.com' },
  shopify_checkout: { order_id: id, shop: 'jtuuus-k3.myshopify.com',
    checkout_url: 'https://jtuuus-k3.myshopify.com/cart/c/cart?key=private-token', shopify_order_id: null, authorization_id: null, capture_id: null },
}
const claim: ShopifyDiagnosticClaim = { order_id: id, event_key: 'a'.repeat(64), event_uuid: id,
  event: 'initiation_checkout_alert_displayed', event_time: '2026-11-19T00:00:00Z',
  capture_source: 'shopify_pixel', properties: { alert_type: 'PAYMENT_ERROR', field_category: 'payment', message: 'private card' }, claim_token: 'lease', attempt_count: 1 }
function setup(patch: Partial<ShopifyDiagnosticDependencies> = {}) {
  return { claim: vi.fn(async () => [claim]), loadOrder: vi.fn(async () => order), finish: vi.fn(async () => true),
    send: vi.fn(async () => {}), now: () => Date.parse('2026-11-19T00:01:00Z'), ...patch }
}
describe('durable checkout observations', () => {
  it('sends canceled/unpaid checkout evidence without ever emitting Purchase or personal fields', async () => {
    const deps = setup()
    expect(await retryShopifyCheckoutDiagnostics(deps)).toMatchObject({ sent: 1 })
    const event = vi.mocked(deps.send).mock.calls[0][0]
    expect(event).toMatchObject({ distinct_id: id, uuid: id, event: claim.event,
      properties: { alert_type: 'PAYMENT_ERROR', payment_provider: 'shopify', order_kind: 'membership', $session_id: id } })
    expect(event.properties).not.toHaveProperty('payment_status')
    expect(event.properties).not.toHaveProperty('meta_event_id')
    expect(JSON.stringify(event)).not.toMatch(/private|checkout_url|reference/)
  })
  it('uses the original UUID/time after an ambiguous delivery and strips thrown secrets', async () => {
    const deps = setup({ send: vi.fn().mockRejectedValueOnce(new Error('private token')).mockResolvedValueOnce(undefined) })
    expect(await retryShopifyCheckoutDiagnostics(deps)).toMatchObject({ retried: 1 })
    expect(await retryShopifyCheckoutDiagnostics(deps)).toMatchObject({ sent: 1 })
    expect(vi.mocked(deps.send).mock.calls[0][0]).toEqual(vi.mocked(deps.send).mock.calls[1][0])
    expect(JSON.stringify(vi.mocked(deps.finish).mock.calls)).not.toContain('private token')
  })
  it('honors opt-out and labels preview/QA instead of reporting production users', async () => {
    const deps = setup({ loadOrder: async () => ({ ...order, analytics_context: { disabled: true } }) })
    expect(await retryShopifyCheckoutDiagnostics(deps)).toMatchObject({ skipped: 1 })
    expect(deps.send).not.toHaveBeenCalled()
    const qa = setup({ loadOrder: async () => ({ ...order, analytics_context: { environment: 'preview', is_internal_qa: true } }) })
    await retryShopifyCheckoutDiagnostics(qa)
    expect(qa.send).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ is_test: true, is_internal_qa: true }) }))
  })
  it('rejects client-originated transaction results and stale worker completion', async () => {
    const invalid = setup({ claim: async () => [{ ...claim, event: 'initiation_checkout_transaction_observed' }] })
    expect(await retryShopifyCheckoutDiagnostics(invalid)).toMatchObject({ retried: 1 })
    expect(invalid.send).not.toHaveBeenCalled()
    const stale = setup({ finish: async () => false })
    expect(await retryShopifyCheckoutDiagnostics(stale)).toMatchObject({ lease_lost: 1 })
  })
  it('rejects an unbound shop and invalid quote', async () => {
    for (const change of [{ amount: 1 }, { shopify_checkout: { ...order.shopify_checkout!, shop: 'other.myshopify.com' } }]) {
      const deps = setup({ loadOrder: async () => ({ ...order, ...change }) })
      expect(await retryShopifyCheckoutDiagnostics(deps)).toMatchObject({ retried: 1 })
      expect(deps.send).not.toHaveBeenCalled()
    }
  })
})
