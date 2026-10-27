import { describe, expect, it } from 'vitest'
import { fixture } from '@/app/dev/voyager-initiation/fixtures'
import { initiationPaymentHold } from './initiation-payment-hold'

describe('Initiation payment hold', () => {
  it('shows the post-checkout window as received, never as checkout again', () => {
    // 2026-10-24: captured payment, order still pending while activation failed.
    const hold = initiationPaymentHold({ userId: 'buyer', status: 'unpaid', paymentStatus: 'pending', checkoutComplete: true, latestOrderKind: 'standard', purchaseKind: null })
    expect(hold).toMatchObject({ phase: 'processing', title: 'PAYMENT RECEIVED', refresh: true })
    expect(hold?.message).toContain('no need to pay again')
  })
  it('treats an unverifiable pending checkout as possibly paid', () => {
    expect(initiationPaymentHold({ ...fixture('pending'), checkoutComplete: null })?.phase).toBe('processing')
    expect(initiationPaymentHold({ ...fixture('pending'), checkoutComplete: undefined })?.phase).toBe('processing')
  })
  it('lets an open or unbound checkout be resumed', () => {
    expect(initiationPaymentHold(fixture('checkout_open'))).toBeNull()
  })
  it.each(['payment_review', 'disputed'] as const)('holds %s for review without polling', name => {
    expect(initiationPaymentHold(fixture(name))).toMatchObject({ phase: 'review', refresh: false })
  })
  it('shows a paid order without membership as activating', () => {
    expect(initiationPaymentHold(fixture('activating'))).toMatchObject({ phase: 'activating', title: 'PAYMENT CONFIRMED', refresh: true })
  })
  it('holds a paid upgrade that has not activated, even for an Initial member', () => {
    expect(initiationPaymentHold({ ...fixture('initial_pack'), paymentStatus: 'paid', latestOrderKind: 'legacy_upgrade' })?.phase).toBe('activating')
  })
  it('holds a completed upgrade checkout for an Initial member', () => {
    expect(initiationPaymentHold(fixture('initial_upgrade_pending'))?.phase).toBe('processing')
  })
  it.each(['initial_pack', 'legacy_pack', 'complete_pack', 'upgraded', 'initiated', 'claimed', 'granted', 'guest', 'unpaid', 'unknown', 'payment_failed', 'canceled', 'refunded'] as const)('leaves %s to its own view', name => {
    expect(initiationPaymentHold(fixture(name))).toBeNull()
  })
  it('never holds a guest or an unreadable record', () => {
    expect(initiationPaymentHold({ ...fixture('pending'), userId: null })).toBeNull()
    expect(initiationPaymentHold({ ...fixture('pending'), status: 'unknown' })).toBeNull()
  })
})
