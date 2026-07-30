import { type NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { provisionVoyagerMembership } from '@/lib/actions/membership'
import { isCheckoutAmountValid } from '@/lib/device-checkout'
import { sendDeviceOrderStatusNotification } from '@/lib/device-batch-notifications'

export const dynamic = 'force-dynamic'

type StoredOrder = {
  id: string
  user_id: string | null
  email: string | null
  amount: number | null
  currency: string
  status: string
  product_type: string
  stripe_session_id: string | null
  device_batch_slug: string | null
  pack_count: number
  tracking_number: string | null
  tracking_url: string | null
}

async function findOrder(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const orderId = session.metadata?.order_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from('voyager_orders') as any)
    .select(
      'id, user_id, email, amount, currency, status, product_type, stripe_session_id, device_batch_slug, pack_count, tracking_number, tracking_url',
    )

  query = orderId
    ? query.eq('id', orderId)
    : query.eq('stripe_session_id', session.id)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as StoredOrder | null
}

async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  storedUserId: string | null,
  email: string | null,
) {
  const userId = session.metadata?.user_id || storedUserId
  if (userId || !email) return userId

  // Legacy Voyager Pack Sessions can arrive without a signed-in account.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  )
  if (existing) return existing.id

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
  const { data: invited } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })
  return invited?.user?.id ?? null
}

async function fulfillCheckoutSession(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  // Delayed payment methods emit `completed` before money has cleared.
  if (session.payment_status === 'unpaid') return

  const order = await findOrder(admin, session)
  if (!order) {
    console.error('[stripe/webhook] no order for Checkout Session:', session.id)
    return
  }

  // Never regress an order that fulfillment has already moved forward. Still
  // retry idempotent membership provisioning in case an earlier delivery
  // committed the order before that final step succeeded.
  if (['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)) {
    if (order.user_id) {
      const provisioned = await provisionVoyagerMembership(order.user_id)
      if (provisioned.error) throw new Error(provisioned.error)
    }
    if (order.product_type === 'device_batch_claim') {
      const email = await sendDeviceOrderStatusNotification(order, 'paid')
      if (email.error) throw new Error(email.error)
    }
    return
  }

  const receivedAmount = session.amount_total
  const receivedCurrency = session.currency?.toLowerCase() ?? null
  const amountMatches = isCheckoutAmountValid(
    order.product_type,
    order.amount,
    receivedAmount,
  )
  if (
    order.amount == null ||
    receivedAmount == null ||
    !amountMatches ||
    order.currency.toLowerCase() !== receivedCurrency
  ) {
    console.error('[stripe/webhook] payment reconciliation failed:', {
      orderId: order.id,
      expectedAmount: order.amount,
      receivedAmount,
      expectedCurrency: order.currency,
      receivedCurrency,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('voyager_orders') as any)
      .update({ status: 'payment_review', stripe_session_id: session.id })
      .eq('id', order.id)
      .in('status', ['pending', 'payment_failed'])
    return
  }

  const email = session.customer_details?.email ?? session.customer_email ?? order.email
  // The shipping shape differs across Stripe API versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shipDetails = (session as any).shipping_details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (session as any).collected_information?.shipping_details
    ?? null
  const ship = shipDetails?.address ?? session.customer_details?.address ?? null
  const recipient = shipDetails?.name ?? session.customer_details?.name ?? null
  const userId = await resolveUserId(admin, session, order.user_id, email)

  // Only one concurrent webhook delivery can move a pending order to paid.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paidRows, error: updateError } = await (admin.from('voyager_orders') as any)
    .update({
      status: 'paid',
      // Voyager Pack promotion codes can reduce the configured list price.
      // Device Batch claims do not enable promotion codes and reconcile exactly.
      amount: receivedAmount,
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      user_id: userId,
      email,
      recipient_name: recipient,
      address_line1: ship?.line1 ?? null,
      address_line2: ship?.line2 ?? null,
      city: ship?.city ?? null,
      state: ship?.state ?? null,
      postal_code: ship?.postal_code ?? null,
      country: ship?.country ?? null,
      phone: session.customer_details?.phone ?? shipDetails?.phone ?? null,
    })
    .eq('id', order.id)
    .in('status', ['pending', 'payment_failed', 'payment_review'])
    .select('id')

  if (updateError) throw updateError
  if (!paidRows?.length) return

  // Both the original membership Pack and a first device claim can activate
  // Voyager status. The provisioning function is itself idempotent.
  if (userId) {
    const provisioned = await provisionVoyagerMembership(userId)
    if (provisioned.error) {
      console.error('[stripe/webhook] membership provisioning failed:', provisioned.error)
      throw new Error(provisioned.error)
    }
  }

  if (order.product_type === 'device_batch_claim') {
    const notification = await sendDeviceOrderStatusNotification(
      { ...order, user_id: userId, email },
      'paid',
    )
    if (notification.error) throw new Error(notification.error)
  }
}

async function markCheckoutFailed(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  status: 'payment_failed' | 'canceled',
) {
  const order = await findOrder(admin, session)
  if (!order) return
  const { data: updatedRows, error: updateError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    admin.from('voyager_orders') as any
  )
    .update({ status, stripe_session_id: session.id })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('id')

  if (updateError) throw updateError
  if (!updatedRows?.length) return

  if (status === 'payment_failed' && order.product_type === 'device_batch_claim') {
    const email = await sendDeviceOrderStatusNotification(order, 'payment_failed')
    if (email.error) throw new Error(email.error)
  }
}

// Stripe is the authority for payment completion. Browser redirects never
// provision access or mark orders paid.
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature') ?? ''
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    if (
      event.type === 'checkout.session.completed'
      || event.type === 'checkout.session.async_payment_succeeded'
    ) {
      await fulfillCheckoutSession(
        admin,
        event.data.object as Stripe.Checkout.Session,
      )
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await markCheckoutFailed(
        admin,
        event.data.object as Stripe.Checkout.Session,
        'payment_failed',
      )
    }

    if (event.type === 'checkout.session.expired') {
      await markCheckoutFailed(
        admin,
        event.data.object as Stripe.Checkout.Session,
        'canceled',
      )
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      if (charge.refunded && typeof charge.payment_intent === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: refundedOrders } = await (admin.from('voyager_orders') as any)
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent', charge.payment_intent)
          .select('id, user_id, email, product_type, device_batch_slug, pack_count, tracking_number, tracking_url')
        for (const order of refundedOrders ?? []) {
          if (order.product_type === 'device_batch_claim') {
            const email = await sendDeviceOrderStatusNotification(order, 'refunded')
            if (email.error) throw new Error(email.error)
          }
        }
        // Membership downgrade and physical return remain a manual operation.
      }
    }
  } catch (error) {
    console.error('[stripe/webhook] fulfillment failed:', error)
    // A non-2xx response asks Stripe to retry transient database failures.
    return NextResponse.json({ error: 'fulfillment failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
