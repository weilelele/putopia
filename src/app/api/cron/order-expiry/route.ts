import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { isCronAuthorized } from '@/lib/cron-auth'
import { ORDER_EXPIRY_MS, releaseOverdueOrder, type ExpiryOrder } from '@/lib/order-expiry'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function sessionSnapshot(session: Stripe.Checkout.Session) {
  return {
    id: session.id, status: session.status, payment_status: session.payment_status,
    payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    order_id: session.metadata?.order_id,
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Previews share production data and must never run this maintenance job.
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ error: 'Production only' }, { status: 403 })
  }
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  const admin = createAdminClient()
  const now = Date.now()
  const cutoff = new Date(now - ORDER_EXPIRY_MS).toISOString()
  const result = { checked: 0, released: 0, protected: 0, unchanged: 0, failed: 0, complete: false }
  let cursor: string | null = null
  try {
    // Keyset pagination remains stable as canceled rows leave the pending set.
    while (Date.now() - now < 240_000) {
      let query = admin.from('voyager_orders')
        .select('id, status, created_at, paid_at, stripe_session_id, stripe_payment_intent')
        .eq('status', 'pending').is('paid_at', null).is('stripe_payment_intent', null)
        .lte('created_at', cutoff).order('id').limit(50)
      if (cursor) query = query.gt('id', cursor)
      const { data, error } = await query
      if (error) throw error
      if (!data.length) { result.complete = true; break }
      for (const order of data as ExpiryOrder[]) {
        if (Date.now() - now >= 240_000) break
        cursor = order.id
        result.checked++
        try {
          const outcome = await releaseOverdueOrder(order, {
            retrieveSession: async (id) => sessionSnapshot(await stripe.checkout.sessions.retrieve(id, {}, { timeout: 10_000, maxNetworkRetries: 1 })),
            expireSession: async (id) => sessionSnapshot(await stripe.checkout.sessions.expire(id, {}, { timeout: 10_000, maxNetworkRetries: 1 })),
            paymentIntentStatus: async (id) => (await stripe.paymentIntents.retrieve(id, {}, { timeout: 10_000, maxNetworkRetries: 1 })).status,
            cancelOrder: async (candidate, deadline) => {
              // voyager_orders is not yet represented in the generated Database type.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let update = (admin.from('voyager_orders') as any).update({ status: 'canceled' })
                .eq('id', candidate.id).eq('status', 'pending').is('paid_at', null)
                .is('stripe_payment_intent', null).lte('created_at', deadline)
              update = candidate.stripe_session_id
                ? update.eq('stripe_session_id', candidate.stripe_session_id)
                : update.is('stripe_session_id', null)
              const { data: changed, error: updateError } = await update.select('id')
              if (updateError) throw updateError
              // Existing order triggers release the Unit and Batch counter in
              // this same transaction, and preserve the Unit event audit trail.
              return Boolean(changed?.length)
            },
          }, now)
          result[outcome]++
          console.info('[order-expiry]', { orderId: order.id, outcome })
        } catch {
          result.failed++
          console.error('[order-expiry] could not verify or release order', { orderId: order.id })
        }
      }
    }
  } catch {
    result.failed++
    console.error('[order-expiry] could not scan orders')
  }
  if (result.released) {
    revalidatePath('/admin/orders')
    revalidatePath('/admin/npcs', 'layout')
    revalidatePath('/devices', 'layout')
  }
  console.info('[order-expiry] summary', result)
  return NextResponse.json(result, { status: result.failed || !result.complete ? 503 : 200 })
}
