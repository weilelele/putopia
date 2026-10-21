import { describe, expect, it } from 'vitest'
import { INITIATION_PRICES, INITIATION_PRICING_VERSION, isInitiationOrderAmount } from './initiation-pricing'
import { validateInitiationPayment } from './initiation-payment'
import { initiationAnalyticsProperties } from './initiation-analytics'
import { initiationMemberStatus } from './initiation-membership'

describe('versioned Voyager bundle receipts', () => {
  const binding = { stripe_livemode: true, currency: 'usd', id: 'order', user_id: 'buyer', stripe_session_id: 'cs_live_bound', price_id: 'price_bound', product_id: 'prod_bound' }
  it.each(['initial', 'standard', 'legacy_upgrade'] as const)('accepts exact %s payment and rejects crossed tier/version/amount', kind => {
    const order = { ...binding, order_kind: kind, amount: INITIATION_PRICES[kind].amount, pricing_version: INITIATION_PRICING_VERSION }
    const evidence = { status: 'complete', paymentStatus: 'paid', mode: 'payment', amount: order.amount, currency: 'usd', livemode: true, orderKind: kind, productType: 'voyager_initiation', userId: 'buyer', orderId: 'order', sessionId: 'cs_live_bound', priceId: 'price_bound', productId: 'prod_bound', quantity: 1, lineCount: 1 }
    expect(validateInitiationPayment(evidence, order)).toBe(true)
    expect(validateInitiationPayment({ ...evidence, amount: order.amount - 1 }, order)).toBe(false)
    expect(validateInitiationPayment({ ...evidence, priceId: 'price_other' }, order)).toBe(false)
    expect(validateInitiationPayment(evidence, { ...order, pricing_version: null })).toBe(false)
    expect(validateInitiationPayment(evidence, { ...order, pricing_version: 'unapproved' })).toBe(false)
    expect(initiationAnalyticsProperties(kind)).toMatchObject({ payable_amount: order.amount / 100, amount_minor: order.amount })
  })
  it('retains old $520/$400 receipts without accepting them as current quotes', () => {
    for (const [order_kind, amount] of [['standard', 52000], ['legacy_upgrade', 40000]] as const) {
      expect(isInitiationOrderAmount({ order_kind, amount })).toBe(true)
      expect(isInitiationOrderAmount({ order_kind, amount, pricing_version: INITIATION_PRICING_VERSION })).toBe(false)
      expect(initiationAnalyticsProperties(order_kind, {}, amount).payable_amount).toBe(amount / 100)
    }
    expect(isInitiationOrderAmount({ order_kind: 'initial', amount: 3800 })).toBe(false)
  })
  it('records the new Initial as a member with upgrade eligibility, without a Console entitlement', () => {
    expect(initiationMemberStatus(false, { source: 'paid', active: true }, true)).toBe('legacy_pack')
    expect(initiationMemberStatus(true, { source: 'paid', active: true }, true)).toBe('initiated')
  })
  it('keeps the fixed upgrade price and honest bundle comparison', () => {
    expect(INITIATION_PRICES.initial.amount + INITIATION_PRICES.legacy_upgrade.amount).toBe(49800)
    expect(49800 - INITIATION_PRICES.standard.amount).toBe(1000)
  })
})
