import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { INITIATION_PRODUCT } from '@/lib/initiation-types'
import { initiationCaptureDecision } from '@/lib/initiation-capture-policy'
import { validateInitiationPayment, verifiedInitiationShipping, type InitiationPaymentEvidence } from '@/lib/initiation-payment'
import { isInitiationShippingRegion } from '@/lib/initiation-checkout-policy'

/** Re-fetch Stripe state on every attempt, including retries after an ambiguous capture. */
export async function reconcileInitiationSession(sessionId: string, stripe: Stripe): Promise<'paid' | 'released' | 'pending'> {
  let session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.product_type !== INITIATION_PRODUCT) throw new Error('Not an Initiation session')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: order, error } = await admin.from('initiation_orders').select('*').eq('id', session.metadata.order_id).single()
  if (error || !order) throw new Error('Initiation order is unavailable')
  if (session.livemode !== order.stripe_livemode || session.metadata.user_id !== order.user_id || session.metadata.order_kind !== order.order_kind ||
    (order.stripe_session_id && order.stripe_session_id !== session.id)) throw new Error('Initiation session binding mismatch')
  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  let intent = intentId ? await stripe.paymentIntents.retrieve(intentId) : null
  if (intent && (intent.livemode !== order.stripe_livemode || intent.metadata.order_id !== order.id ||
    intent.metadata.order_kind !== order.order_kind || intent.metadata.product_type !== INITIATION_PRODUCT ||
    intent.amount !== order.amount || intent.currency !== order.currency ||
    (order.stripe_payment_intent && order.stripe_payment_intent !== intent.id))) throw new Error('Initiation intent binding mismatch')
  const release = async () => {
    const { data, error: releaseError } = await admin.from('initiation_orders').update({ status: 'canceled', stripe_session_id: session.id,
      ...(intent ? { stripe_payment_intent: intent.id } : {}) }).eq('id', order.id).in('status', ['pending', 'payment_review']).select('id')
    if (releaseError) throw releaseError
    return data.length ? 'released' as const : 'pending' as const
  }
  if (session.status === 'expired' && session.payment_status === 'unpaid') {
    if (intent && (intent.status !== 'canceled' || intent.amount_received !== 0)) return 'pending'
    return release()
  }
  if (session.status !== 'complete') return 'pending'
  if (!intent) throw new Error('Missing Initiation payment intent')
  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 })
  const line = lines.data[0], product = line?.price?.product
  const evidence = (): InitiationPaymentEvidence => ({
    livemode: session.livemode, status: session.status, paymentStatus: session.payment_status, mode: session.mode,
    amount: session.amount_total, currency: session.currency, productType: session.metadata?.product_type, orderKind: session.metadata?.order_kind,
    userId: session.metadata?.user_id, orderId: session.metadata?.order_id, sessionId: session.id,
    priceId: line?.price?.id ?? null, productId: typeof product === 'string' ? product : product?.id ?? null,
    quantity: line?.quantity ?? null, lineCount: lines.has_more ? 3 : lines.data.length,
  })
  const details = session as Stripe.Checkout.Session & { shipping_details?: unknown; collected_information?: { shipping_details?: unknown } }
  const shipping = verifiedInitiationShipping(details.collected_information?.shipping_details ?? details.shipping_details)
  const review = async (reason: string): Promise<never> => {
    const { error: reviewError } = await admin.from('initiation_orders').update({ status: 'payment_review', stripe_session_id: session.id,
      stripe_payment_intent: intent!.id, ...(shipping ? { shipping } : {}) }).eq('id', order.id).eq('status', 'pending')
    if (reviewError) throw reviewError
    throw new Error(reason)
  }
  if (['refunded', 'disputed'].includes(order.status)) return 'pending' // Never resurrect revoked membership.
  if (intent.capture_method === 'manual') {
    if (intent.status === 'canceled' && intent.amount_received === 0 && validateInitiationPayment({ ...evidence(), paymentStatus: 'paid' }, order)) return release()
    const decide = () => initiationCaptureDecision(evidence(), order, {
      id: intent!.id, livemode: intent!.livemode, status: intent!.status, captureMethod: intent!.capture_method,
      amount: intent!.amount, currency: intent!.currency, amountCapturable: intent!.amount_capturable, amountReceived: intent!.amount_received,
      orderId: intent!.metadata.order_id, orderKind: intent!.metadata.order_kind, productType: intent!.metadata.product_type,
    }, intentId!, shipping)
    let decision = decide()
    if (decision === 'capture' && order.order_kind === 'legacy_upgrade') {
      const legacy = await admin.rpc('eligible_legacy_initiation_order', { p_user: order.user_id })
      if (legacy.error) throw legacy.error
      if (!legacy.data || legacy.data !== order.legacy_order_id) decision = 'cancel_authorization'
    }
    if (decision === 'cancel_authorization') {
      intent = await stripe.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `initiation:cancel:${order.id}` })
      if (intent.status !== 'canceled' || intent.amount_received !== 0) throw new Error('Authorization cancellation requires reconciliation')
      return release()
    }
    if (decision === 'capture') {
      // If this times out, leave the reservation held. Retry reads Stripe before acting.
      await stripe.paymentIntents.capture(intent.id, { amount_to_capture: order.amount }, { idempotencyKey: `initiation:capture:${order.id}` })
      intent = await stripe.paymentIntents.retrieve(intent.id)
      session = await stripe.checkout.sessions.retrieve(session.id)
      decision = decide()
    }
    if (decision === 'wait') return 'pending'
    if (decision !== 'confirmed_paid') return review('Initiation authorization requires reconciliation')
  } else {
    // Existing automatic-capture sessions created before this rollout remain reconcilable.
    if (session.metadata?.capture_policy === 'contiguous_us_manual_v1') return review('Manual capture configuration mismatch')
    if (session.payment_status === 'unpaid') return 'pending'
    if (intent.status !== 'succeeded' || intent.amount_received !== order.amount || !validateInitiationPayment(evidence(), order)) return review('Initiation payment requires reconciliation')
    if (!shipping || !isInitiationShippingRegion(shipping.address)) return review('Shipping address is outside the contiguous United States; payment requires review')
  }
  const { error: completeError } = await admin.rpc('complete_initiation', {
    p_order: order.id, p_session: session.id, p_user: order.user_id, p_intent: intent.id, p_shipping: shipping,
  })
  if (completeError) throw completeError
  return 'paid'
}
