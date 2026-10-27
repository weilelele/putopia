import type { InitiationSnapshot } from './initiation-types'

export type InitiationPaymentHold = {
  phase: 'processing' | 'review' | 'activating'
  title: string
  message: string
  /** Server records are expected to change soon; re-read them automatically. */
  refresh: boolean
}
export type PaymentHoldInput = Pick<InitiationSnapshot, 'userId' | 'status' | 'paymentStatus' | 'purchaseKind' | 'checkoutComplete' | 'latestOrderKind'>

const NO_REPEAT = 'There is no need to pay again.'
const HOLDS = {
  processing: { phase: 'processing', title: 'PAYMENT RECEIVED', refresh: true,
    message: `Your checkout is complete. We are confirming the payment and activating your membership; this usually takes under a minute. ${NO_REPEAT}` },
  activating: { phase: 'activating', title: 'PAYMENT CONFIRMED', refresh: true,
    message: `Your payment is confirmed. We are activating your membership and delivery records; this usually takes under a minute. ${NO_REPEAT}` },
  review: { phase: 'review', title: 'PAYMENT UNDER REVIEW', refresh: false,
    message: `Your payment was received and is being reviewed before your membership is activated. ${NO_REPEAT}` },
  disputed: { phase: 'review', title: 'PAYMENT UNDER REVIEW', refresh: false,
    message: 'Your payment is under review. Entitlements may be paused until the review is complete.' },
} satisfies Record<string, InitiationPaymentHold>

/**
 * A completed, held or unactivated payment replaces checkout with its status.
 * Stripe can return the buyer before reconciliation commits; offering checkout
 * again in that window only produces a 409 from the checkout route.
 */
export function initiationPaymentHold(s: PaymentHoldInput): InitiationPaymentHold | null {
  if (!s.userId || s.status === 'initiated' || s.status === 'granted' || s.status === 'unknown') return null
  switch (s.paymentStatus) {
    // Only an open or unbound checkout can be resumed; an unverifiable one is treated as paid.
    case 'pending': return s.checkoutComplete === false ? null : HOLDS.processing
    case 'payment_review': return HOLDS.review
    case 'disputed': return HOLDS.disputed
    // A paid Initial order is a confirmed Initial membership that may still upgrade.
    case 'paid': return s.status === 'legacy_pack' && (s.latestOrderKind ?? s.purchaseKind) === 'initial' ? null : HOLDS.activating
    default: return null
  }
}
