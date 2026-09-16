/** Two days after order creation; Checkout itself may expire sooner. */
export const ORDER_EXPIRY_MS = 48 * 60 * 60 * 1000

export type ExpiryOrder = {
  id: string
  status: string
  created_at: string
  paid_at: string | null
  stripe_session_id: string | null
  stripe_payment_intent: string | null
}
export type ExpirySession = {
  id: string
  status: string | null
  payment_status: string
  payment_intent: string | null
  order_id?: string
}
export interface ExpiryDependencies {
  retrieveSession(id: string): Promise<ExpirySession>
  expireSession(id: string): Promise<ExpirySession>
  paymentIntentStatus(id: string): Promise<string>
  /** Must compare status, paid_at, session and age again in the write. */
  cancelOrder(order: ExpiryOrder, cutoff: string): Promise<boolean>
}

export function isOrderOverdue(order: ExpiryOrder, now: number): boolean {
  return order.status === 'pending' && !order.paid_at && !order.stripe_payment_intent
    && Date.parse(order.created_at) <= now - ORDER_EXPIRY_MS
}

/** Fail closed on Stripe errors. Expiring the Session prevents a late payment. */
export async function releaseOverdueOrder(
  order: ExpiryOrder,
  dependencies: ExpiryDependencies,
  now: number,
): Promise<'released' | 'protected' | 'unchanged'> {
  if (!isOrderOverdue(order, now)) return 'protected'
  if (order.stripe_session_id) {
    let session = await dependencies.retrieveSession(order.stripe_session_id)
    if (session.id !== order.stripe_session_id || (session.order_id && session.order_id !== order.id)) {
      throw new Error('Checkout Session does not match order')
    }
    if (session.payment_status !== 'unpaid' || session.status === 'complete') return 'protected'
    if (session.status === 'open') {
      // If payment wins this race Stripe rejects expiration; do not release.
      session = await dependencies.expireSession(session.id)
    }
    if (session.status !== 'expired' || session.payment_status !== 'unpaid') return 'protected'
    if (session.payment_intent && await dependencies.paymentIntentStatus(session.payment_intent) !== 'canceled') {
      return 'protected'
    }
  }
  const canceled = await dependencies.cancelOrder(order, new Date(now - ORDER_EXPIRY_MS).toISOString())
  return canceled ? 'released' : 'unchanged'
}
