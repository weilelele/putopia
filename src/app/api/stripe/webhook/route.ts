import { type NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { provisionVoyagerMembership } from '@/lib/actions/membership'

export const dynamic = 'force-dynamic'

// POST /api/stripe/webhook — Stripe fulfillment.
// On checkout.session.completed: find/create the account, mark the order paid,
// store the US shipping address, and run the post-payment provisioning.
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 })
  }

  const sig = req.headers.get('stripe-signature') ?? ''
  const raw = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const orderId = s.metadata?.order_id || null
    const email =
      s.customer_details?.email ?? s.customer_email ?? null
    // shipping_details shape varies by Stripe API version — read it loosely.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shipDetails = (s as any).shipping_details ?? (s as any).collected_information?.shipping_details ?? null
    const ship = shipDetails?.address ?? s.customer_details?.address ?? null
    const recipient = shipDetails?.name ?? s.customer_details?.name ?? null

    // Resolve the account: metadata → existing user by email → invite a new one.
    let userId = s.metadata?.user_id || null
    if (!userId && email) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = list?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      )
      if (existing) {
        userId = existing.id
      } else {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
        const { data: invited } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${siteUrl}/auth/callback?next=/register`,
        })
        userId = invited?.user?.id ?? null
      }
    }

    // Mark the order paid + store the shipping address (idempotent by id/session).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (admin.from('voyager_orders') as any).update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent:
        typeof s.payment_intent === 'string' ? s.payment_intent : null,
      user_id: userId,
      email,
      recipient_name: recipient,
      address_line1: ship?.line1 ?? null,
      address_line2: ship?.line2 ?? null,
      city: ship?.city ?? null,
      state: ship?.state ?? null,
      postal_code: ship?.postal_code ?? null,
      country: ship?.country ?? 'US',
    })
    if (orderId) await q.eq('id', orderId)
    else await q.eq('stripe_session_id', s.id)

    // Post-payment provisioning (idempotent).
    if (userId) await provisionVoyagerMembership(userId)
  }

  if (event.type === 'charge.refunded') {
    const c = event.data.object as Stripe.Charge
    if (typeof c.payment_intent === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('voyager_orders') as any)
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent', c.payment_intent)
      // Note: role/membership downgrade on refund is handled manually for now.
    }
  }

  return NextResponse.json({ received: true })
}
