import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { INITIATION_PRODUCT } from '@/lib/initiation-types'
import { reconcileInitiationSession } from '@/lib/initiation-reconciliation'

/** True means the event belongs to Initiation and must not enter legacy fulfillment. */
export async function handleInitiationWebhook(event: Stripe.Event, stripe: Stripe): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
    const object = event.data.object as Stripe.Charge | Stripe.Dispute
    const intentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id
    if (!intentId) return false
    const intent = await stripe.paymentIntents.retrieve(intentId)
    if (intent.metadata.product_type !== INITIATION_PRODUCT) {
      // Historical Pack refunds/disputes revoke discount eligibility even when
      // legacy intent metadata predates product tagging. Match stored evidence.
      const { data: legacy, error: legacyError } = await admin.from('voyager_orders').select('id').eq('stripe_payment_intent', intentId).eq('product_type', 'voyager_pack').limit(1)
      if (legacyError) throw legacyError
      if (!legacy?.length) return false
      const { error: holdError } = await admin.rpc('hold_initiation_payment', { p_intent: intentId, p_reason: event.type === 'charge.refunded' ? 'refunded' : 'disputed' })
      if (holdError) throw holdError
      return false // preserve historical refund/order handling too
    }
    // Retrieve cumulative current refund facts; delayed events must not restore access.
    const refund = event.type === 'charge.refunded'
      ? await stripe.charges.retrieve((object as Stripe.Charge).id)
      : null
    if (refund && (refund.currency !== 'usd' || refund.payment_intent !== intentId)) throw new Error('Initiation refund binding mismatch')
    const { error } = refund
      ? await admin.rpc('record_initiation_refund', { p_intent: intentId, p_amount: refund.amount, p_refunded: refund.amount_refunded })
      : await admin.rpc('hold_initiation_payment', { p_intent: intentId, p_reason: 'disputed' })
    if (error) throw error
    return true
  }
  if (['payment_intent.amount_capturable_updated', 'payment_intent.succeeded', 'payment_intent.canceled'].includes(event.type)) {
    const intent = event.data.object as Stripe.PaymentIntent
    if (intent.metadata.product_type !== INITIATION_PRODUCT) return false
    // The create/bind write may have lost a race with Stripe's event delivery.
    const sessions = await stripe.checkout.sessions.list({ payment_intent: intent.id, limit: 2 })
    if (sessions.has_more || sessions.data.length !== 1) throw new Error('Initiation intent session is not available yet')
    await reconcileInitiationSession(sessions.data[0].id, stripe)
    return true
  }
  if (!event.type.startsWith('checkout.session.')) return false
  const session = event.data.object as Stripe.Checkout.Session
  if (session.metadata?.product_type !== INITIATION_PRODUCT) return false
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
    await reconcileInitiationSession(session.id, stripe)
  }
  return true
}
