import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { reconcileInitiationSession } from '@/lib/initiation-reconciliation'
/** Recover missed capture/completion events as well as verified expired sessions. */
export async function reconcileInitiationExpiry(stripe: Stripe) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: orders, error } = await admin.from('initiation_orders').select('id,stripe_session_id,user_id')
    .in('status', ['pending', 'payment_review']).order('created_at', { ascending: true }).limit(100)
  if (error) throw error
  let released = 0, failed = false
  for (const order of orders) {
    if (!order.stripe_session_id) continue // Ambiguous create; manual reconciliation required.
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      if (session.metadata?.order_id !== order.id || session.metadata?.user_id !== order.user_id) throw new Error('Initiation expiry binding mismatch')
      if (await reconcileInitiationSession(session.id, stripe) === 'released') released++
    } catch { failed = true } // One damaged record must not starve other pending payments.
  }
  if (failed) throw new Error('Some Initiation payments still require reconciliation')
  return released
}
