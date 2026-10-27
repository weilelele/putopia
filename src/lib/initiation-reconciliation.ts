import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { INITIATION_PRODUCT, type InitiationOrderKind } from '@/lib/initiation-types'
import { initiationCaptureDecision } from '@/lib/initiation-capture-policy'
import { validateInitiationPayment, verifiedInitiationShipping, type InitiationPaymentEvidence } from '@/lib/initiation-payment'
import { isInitiationShippingRegion } from '@/lib/initiation-checkout-policy'
import { sendPendingInitiationMetaPurchases } from '@/lib/initiation-meta-purchases'
import { sendPendingInitiationAnalytics } from '@/lib/initiation-analytics-outbox'
import { initiationConfirmationEmail } from '@/lib/initiation-email'
import { sendTrackedEmail } from '@/lib/tracked-email'
import { accountState, activationLink } from '@/lib/activation'
import { INITIATION_ACTIVATION_NEXT } from '@/lib/initiation-email-checkout'

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
      const legacy = await admin.rpc(order.initial_order_id ? 'eligible_initial_initiation_order' : 'eligible_legacy_initiation_order', { p_user: order.user_id })
      if (legacy.error) throw legacy.error
      if (!legacy.data || legacy.data !== (order.initial_order_id ?? order.legacy_order_id)) decision = 'cancel_authorization'
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
  // complete_initiation can succeed while retaining payment_review/refunded.
  const { data: completed, error: completedError } = await admin.from('initiation_orders').select('status').eq('id', order.id).single()
  if (completedError) throw completedError
  if (completed?.status !== 'paid') return 'pending'
  try {
    await sendPendingInitiationMetaPurchases(admin, stripe, { orderId: order.id, limit: 1 })
  } catch {
    // Payment/entitlements remain committed; the persistent outbox is retried by cron.
    console.error('[initiation-meta] Purchase delivery deferred to the outbox retry')
  }
  try { await sendPendingInitiationAnalytics(admin, stripe, { orderId: order.id, limit: 2 }) }
  catch { console.warn('[initiation-analytics] Paid analytics deferred to the outbox retry') }
  // Only the reconciliation that moved this order to paid sends it; late events for older paid orders do not.
  if (order.status !== 'paid') {
    try { await sendInitiationConfirmation(order, session) }
    catch (error) { console.error('[initiation-email] Confirmation email failed:', error instanceof Error ? error.message : 'unknown') }
  }
  return 'paid'
}

/**
 * The $38 / $488 (or upgrade) confirmation, once per order: email_delivery_log skips a repeat, so later
 * reconciliations of a paid order never resend it. A buyer who has not set a password gets an activation link in it.
 */
async function sendInitiationConfirmation(order: { id: string; user_id: string; order_kind: InitiationOrderKind; amount: number; pricing_version?: string | null }, session: Stripe.Checkout.Session) {
  const recipient = session.customer_details?.email ?? session.customer_email
  if (!recipient) throw new Error('Initiation session has no buyer email')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiverseco.org'
  const activated = (await accountState(order.user_id)).activated
  const email = initiationConfirmationEmail(siteUrl, order.order_kind, order, activated ? null : activationLink(order.user_id, INITIATION_ACTIVATION_NEXT))
  const sent = await sendTrackedEmail({ eventKey: `initiation-confirmed:${order.id}`, userId: order.user_id, recipient, category: 'initiation_confirmation', ...email })
  if (sent.error) throw new Error(sent.error)
}
