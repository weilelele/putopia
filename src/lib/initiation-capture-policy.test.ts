import { describe, expect, it } from 'vitest'
import { initiationCaptureDecision, type InitiationAuthorization } from './initiation-capture-policy'
import type { InitiationPaymentEvidence } from './initiation-payment'
const order = { id: 'order', user_id: 'user', status: 'pending', stripe_livemode: false, order_kind: 'standard' as const,
  amount: 52000, currency: 'usd', stripe_session_id: 'cs_test_1', price_id: 'price_520', product_id: 'prod_init' }
const evidence: InitiationPaymentEvidence = { status: 'complete', paymentStatus: 'unpaid', mode: 'payment', amount: 52000,
  currency: 'usd', livemode: false, orderKind: 'standard', productType: 'voyager_initiation', userId: 'user', orderId: 'order',
  sessionId: 'cs_test_1', priceId: 'price_520', productId: 'prod_init', quantity: 1, lineCount: 1 }
const intent: InitiationAuthorization = { id: 'pi_fixture', livemode: false, status: 'requires_capture', captureMethod: 'manual', amount: 52000,
  currency: 'usd', amountCapturable: 52000, amountReceived: 0, orderId: 'order', orderKind: 'standard', productType: 'voyager_initiation' }
const shipping = (state: string) => ({ name: 'Fixture', address: { country: 'US', state, line1: '1 Fixture Street' } })
describe('manual-capture delivery-region gate', () => {
  it.each(['CA', 'DC', 'NY'])('authorizes capture for supported %s without treating it as paid', state => {
    expect(initiationCaptureDecision(evidence, order, intent, intent.id, shipping(state))).toBe('capture')
  })
  it.each(['AK', 'HI', 'PR', 'GU', 'VI', 'AS', 'MP', 'AA', 'AE', 'AP', ''])('cancels rather than captures unsupported %s', state => {
    expect(initiationCaptureDecision(evidence, order, intent, intent.id, shipping(state))).toBe('cancel_authorization')
  })
  it.each([{ id: 'other' }, { amount: 40000 }, { currency: 'eur' }, { livemode: true }, { orderId: 'other' },
    { orderKind: 'legacy_upgrade' }, { captureMethod: 'automatic' }, { amountReceived: 1 }, { amountCapturable: 1 }, { productType: 'device' }])('holds conflicting intent %j', patch => {
    expect(initiationCaptureDecision(evidence, order, { ...intent, ...patch }, intent.id, shipping('CA'))).toBe('review')
  })
  it.each([{ userId: 'other' }, { priceId: 'other' }, { quantity: 2 }, { amount: 1 }, { paymentStatus: 'no_payment_required' }])('holds conflicting session %j', patch => {
    expect(initiationCaptureDecision({ ...evidence, ...patch }, order, intent, intent.id, shipping('CA'))).toBe('review')
  })
  it('does not activate a merely authorized payment or stale unpaid snapshot after capture', () => {
    const paid = { ...intent, status: 'succeeded', amountReceived: 52000, amountCapturable: 0 }
    expect(initiationCaptureDecision(evidence, order, paid, intent.id, shipping('CA'))).toBe('review')
    expect(initiationCaptureDecision({ ...evidence, paymentStatus: 'paid' }, order, paid, intent.id, shipping('CA'))).toBe('confirmed_paid')
    expect(initiationCaptureDecision({ ...evidence, paymentStatus: 'paid' }, order, paid, intent.id, shipping('AK'))).toBe('review')
  })
  it('does not capture canceled/refunded orders or incomplete shipping', () => {
    for (const status of ['refunded', 'canceled', 'disputed', 'paid']) expect(initiationCaptureDecision(evidence, { ...order, status }, intent, intent.id, shipping('CA'))).toBe('review')
    expect(initiationCaptureDecision(evidence, order, intent, intent.id, null)).toBe('review')
  })
  it('applies the same exact amount check to the $400 upgrade', () => {
    const upgrade = { ...order, order_kind: 'legacy_upgrade' as const, amount: 40000, price_id: 'price_400' }
    const receipt = { ...evidence, orderKind: 'legacy_upgrade', amount: 40000, priceId: 'price_400' }
    const authorized = { ...intent, orderKind: 'legacy_upgrade', amount: 40000, amountCapturable: 40000 }
    expect(initiationCaptureDecision(receipt, upgrade, authorized, intent.id, shipping('DC'))).toBe('capture')
  })
})
