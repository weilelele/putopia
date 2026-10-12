// Authorization gate used before capture and before membership activation.
// Only use with server-retrieved Stripe evidence and the saved local order.
import { validateInitiationPayment, verifiedInitiationShipping, type InitiationPaymentEvidence } from './initiation-payment'
import { isInitiationShippingRegion } from './initiation-checkout-policy'

type SavedOrder = Parameters<typeof validateInitiationPayment>[1] & { status: string }
export interface InitiationAuthorization {
  id: string
  livemode: boolean
  status: string
  captureMethod: string
  amount: number
  currency: string
  amountCapturable: number
  amountReceived: number
  orderId: string | undefined
  orderKind: string | undefined
  productType: string | undefined
}
export type InitiationCaptureDecision = 'capture' | 'cancel_authorization' | 'confirmed_paid' | 'wait' | 'review'

/** A capture decision never grants membership; only confirmed_paid may proceed. */
export function initiationCaptureDecision(
  evidence: InitiationPaymentEvidence,
  order: SavedOrder,
  intent: InitiationAuthorization,
  sessionIntentId: string,
  rawShipping: unknown,
): InitiationCaptureDecision {
  if (!['pending', 'payment_review', 'paid'].includes(order.status)) return 'review'
  if (intent.id !== sessionIntentId || intent.livemode !== order.stripe_livemode || intent.orderId !== order.id ||
    intent.orderKind !== order.order_kind || intent.productType !== 'voyager_initiation' ||
    intent.amount !== order.amount || intent.currency !== order.currency || intent.captureMethod !== 'manual') return 'review'
  if (!['paid', 'unpaid'].includes(evidence.paymentStatus)) return 'review'
  // This normalizes ONLY the payment-status field for immutable purchase matching.
  // Actual authorization/capture state is checked independently below.
  if (!validateInitiationPayment({ ...evidence, paymentStatus: 'paid' }, order)) return 'review'
  const shipping = verifiedInitiationShipping(rawShipping)
  if (!shipping) return 'review'
  const allowed = isInitiationShippingRegion(shipping.address)
  if (intent.status === 'requires_capture') {
    if (order.status !== 'pending' || evidence.paymentStatus !== 'unpaid' || intent.amountReceived !== 0 || intent.amountCapturable !== order.amount) return 'review'
    return allowed ? 'capture' : 'cancel_authorization'
  }
  if (intent.status === 'succeeded') {
    return allowed && evidence.paymentStatus === 'paid' && intent.amountReceived === order.amount && intent.amountCapturable === 0
      ? 'confirmed_paid' : 'review'
  }
  return intent.status === 'processing' && intent.amountReceived === 0 ? 'wait' : 'review'
}
