import { describe, expect, it } from 'vitest'
import { initiationOffer, resolveInitiationOffer } from './initiation-offers'
import { initiationAnalyticsProperties } from './initiation-analytics'
import { validateInitiationPayment, type InitiationPaymentEvidence } from './initiation-payment'
import type { InitiationOrderKind } from './initiation-types'
import { initiationLoginPath } from '@/app/voyager-initiation/navigation'

describe('four immutable Initiation offers', () => {
  it('preserves Initial selection and the device return context through login', () => {
    const redirect = new URL(initiationLoginPath('/devices/batches/kyoto', 'initial'), 'https://example.test').searchParams.get('redirect')!
    const target = new URL(redirect, 'https://example.test')
    expect(target.pathname).toBe('/voyager-initiation')
    expect(target.searchParams.get('bundle')).toBe('initial')
    expect(target.searchParams.get('from')).toBe('/devices/batches/kyoto')
    expect(initiationLoginPath(null)).toBe('/login?redirect=%2Fvoyager-initiation')
  })
  const ordinary = { legacy: false, initial: false, bundlesEnabled: true }
  it('preserves the existing body-less $520 checkout and historical $400 eligibility', () => {
    expect(resolveInitiationOffer(undefined, ordinary)).toBe('standard')
    expect(resolveInitiationOffer(undefined, { ...ordinary, legacy: true })).toBe('legacy_upgrade')
    expect(resolveInitiationOffer('complete', { ...ordinary, legacy: true })).toBe('legacy_upgrade')
  })
  it('resolves $500 from verified Initial ownership, never from a browser tier', () => {
    expect(resolveInitiationOffer('complete', { ...ordinary, initial: true })).toBe('initial_upgrade')
    expect(resolveInitiationOffer(undefined, { ...ordinary, initial: true })).toBe('initial_upgrade')
    expect(resolveInitiationOffer('initial_upgrade', ordinary)).toBeNull()
    expect(resolveInitiationOffer('legacy_upgrade', ordinary)).toBeNull()
    expect(resolveInitiationOffer(48, ordinary)).toBeNull()
    expect(resolveInitiationOffer('initial', { ...ordinary, legacy: true })).toBeNull()
  })
  it('keeps new offers closed without changing existing offers when bundles are off', () => {
    const closed = { ...ordinary, bundlesEnabled: false }
    expect(resolveInitiationOffer('initial', closed)).toBeNull()
    expect(resolveInitiationOffer('complete', { ...closed, initial: true })).toBeNull()
    expect(resolveInitiationOffer(undefined, closed)).toBe('standard')
    expect(resolveInitiationOffer(undefined, { ...closed, legacy: true })).toBe('legacy_upgrade')
  })
  it.each([['standard', 52000], ['legacy_upgrade', 40000], ['initial', 4800], ['initial_upgrade', 50000]] as const)('%s binds payment and analytics to %i cents', (kind, amount) => {
    const priceId = `price_${kind}`
    const order = { stripe_livemode: false, order_kind: kind, amount, currency: 'usd', id: 'order', user_id: 'user', stripe_session_id: 'cs_1', price_id: priceId, product_id: 'prod_1' }
    const evidence: InitiationPaymentEvidence = { status: 'complete', paymentStatus: 'paid', mode: 'payment', amount, currency: 'usd', livemode: false, orderKind: kind, productType: 'voyager_initiation', userId: 'user', orderId: 'order', sessionId: 'cs_1', priceId, productId: 'prod_1', quantity: 1, lineCount: 1 }
    expect(initiationOffer(kind)?.amount).toBe(amount)
    expect(validateInitiationPayment(evidence, order)).toBe(true)
    expect(validateInitiationPayment({ ...evidence, amount: amount - 1 }, order)).toBe(false)
    expect(validateInitiationPayment({ ...evidence, paymentStatus: 'unpaid' }, order)).toBe(false)
    expect(initiationAnalyticsProperties(kind)).toMatchObject({ order_kind: kind, payable_amount: amount / 100, amount_minor: amount, currency: 'USD' })
    for (const other of ['standard', 'legacy_upgrade', 'initial', 'initial_upgrade'] as InitiationOrderKind[]) {
      if (other !== kind) expect(validateInitiationPayment({ ...evidence, orderKind: other }, order)).toBe(false)
    }
  })
  it('rejects unknown/prototype offers', () => {
    expect(initiationOffer('constructor')).toBeNull()
    expect(initiationOffer('__proto__')).toBeNull()
    expect(initiationOffer('initial_free')).toBeNull()
  })
})
