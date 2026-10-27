import type Stripe from 'stripe'
import { validInitiationAnalyticsSession, type InitiationAnalyticsOrder } from './initiation-analytics-outbox'
import type { InitiationOrderKind } from './initiation-pricing'
import { INITIATION_PRODUCT } from './initiation-types'

export type SwitchableInitiationOrder = InitiationAnalyticsOrder
export type InitiationCheckoutSwitchDependencies = {
  retrieveSession(id: string): Promise<Stripe.Checkout.Session>
  expireSession(id: string): Promise<Stripe.Checkout.Session>
  retrieveIntent(id: string): Promise<Stripe.PaymentIntent>
  /** Compare the order ID, owner, pending status, session, and absent payment evidence again in the write. */
  cancelOrder(order: SwitchableInitiationOrder): Promise<boolean>
}

/** Retire an unpaid checkout before reserving another bundle. Never release an ambiguous Stripe create. */
export async function prepareInitiationBundleSwitch(
  order: SwitchableInitiationOrder | null,
  kind: InitiationOrderKind,
  deps: InitiationCheckoutSwitchDependencies,
): Promise<boolean> {
  if (!order || order.order_kind === kind) return true
  if (order.status !== 'pending' || order.paid_at || order.stripe_payment_intent || !order.stripe_session_id) return false
  let session = await deps.retrieveSession(order.stripe_session_id)
  if (!validInitiationAnalyticsSession(order, session) || session.payment_status !== 'unpaid') return false
  if (session.status === 'open') {
    // Stripe rejects expiration if payment wins the race. A timeout must leave the order protected.
    session = await deps.expireSession(session.id)
  }
  if (!validInitiationAnalyticsSession(order, session) || session.status !== 'expired' || session.payment_status !== 'unpaid') return false
  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (intentId) {
    const intent = await deps.retrieveIntent(intentId)
    if (intent.id !== intentId || intent.status !== 'canceled' || intent.amount_received !== 0
      || intent.livemode !== order.stripe_livemode || intent.amount !== order.amount || intent.currency !== order.currency
      || intent.metadata.product_type !== INITIATION_PRODUCT || intent.metadata.order_id !== order.id
      || intent.metadata.order_kind !== order.order_kind) return false
  }
  return deps.cancelOrder(order)
}
