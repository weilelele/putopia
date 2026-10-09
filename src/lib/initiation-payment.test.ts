import { describe, expect, it } from 'vitest'
import { validateInitiationPayment, type InitiationPaymentEvidence, verifiedInitiationShipping } from './initiation-payment'
const order = { stripe_livemode: false, order_kind: 'standard' as const, amount: 52000, currency: 'usd', id: 'order', user_id: 'buyer', stripe_session_id: 'cs_test_1', price_id: 'price_new', product_id: 'prod_new' }
const evidence: InitiationPaymentEvidence = { livemode: false, orderKind: 'standard', status: 'complete', paymentStatus: 'paid', mode: 'payment', amount: 52000, currency: 'usd', productType: 'voyager_initiation', userId: 'buyer', orderId: 'order', sessionId: 'cs_test_1', priceId: 'price_new', productId: 'prod_new', quantity: 1, lineCount: 1 }
describe('Initiation signed payment reconciliation', () => {
  it('accepts only the dedicated one-time purchase', () => expect(validateInitiationPayment(evidence, order)).toBe(true))
  it.each([
    { livemode: true }, { orderKind: 'legacy_upgrade' }, { amount: 1200 }, { amount: 50800 }, { paymentStatus: 'unpaid' }, { paymentStatus: 'no_payment_required' },
    { status: 'open' }, { mode: 'subscription' }, { currency: 'eur' }, { userId: 'other' }, { orderId: 'other' },
    { sessionId: 'cs_test_other' }, { priceId: 'price_legacy' }, { productId: 'prod_device' },
    { quantity: 2 }, { lineCount: 2 }, { productType: 'voyager_pack' },
  ])('rejects mismatched evidence %j', patch => expect(validateInitiationPayment({ ...evidence, ...patch }, order)).toBe(false))
  it('reconciles the upgrade against its saved kind and exact $400 amount', () => {
    const upgrade = { ...order, order_kind: 'legacy_upgrade' as const, amount: 40000, price_id: 'price_upgrade' }
    const receipt = { ...evidence, orderKind: 'legacy_upgrade', amount: 40000, priceId: 'price_upgrade' }
    expect(validateInitiationPayment(receipt, upgrade)).toBe(true)
    expect(validateInitiationPayment({ ...receipt, amount: 52000 }, upgrade)).toBe(false)
    expect(validateInitiationPayment({ ...receipt, orderKind: 'standard' }, upgrade)).toBe(false)
    expect(validateInitiationPayment(receipt, { ...upgrade, amount: 50800 })).toBe(false)
  })
  it('allows a webhook to win the session-binding race only with the other purchase facts intact', () => {
    expect(validateInitiationPayment(evidence, { ...order, stripe_session_id: null })).toBe(true)
    expect(validateInitiationPayment({ ...evidence, userId: 'npc' }, { ...order, stripe_session_id: null })).toBe(false)
  })
})

describe('trusted Stripe shipping shape', () => {
  it('requires a shipping recipient and real address shape', () => {
    expect(verifiedInitiationShipping({ name: ' Member ', address: { line1: ' 1 Road ', country: 'US' } })).toMatchObject({ name: 'Member', address: { line1: '1 Road', country: 'US' } })
    expect(verifiedInitiationShipping(null)).toBeNull()
    expect(verifiedInitiationShipping({ email: 'billing@example.test' })).toBeNull()
    expect(verifiedInitiationShipping({ name: 'Member', address: { country: 'US' } })).toBeNull()
    expect(verifiedInitiationShipping({ name: 'Member', address: { line1: '1 Road', country: 'USA' } })).toBeNull()
  })
})
