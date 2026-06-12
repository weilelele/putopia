import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured, PACK_PRICE_CENTS } from '@/lib/stripe'
import { getCurrentBatch, provisionVoyagerMembership } from '@/lib/actions/membership'

export const dynamic = 'force-dynamic'

// GET /api/checkout — starts a purchase of the $12 Initial Voyager Pack.
// Reached from the "Become a Voyager" CTA (a top-level link), so a redirect
// response works directly.
export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const batch = await getCurrentBatch()

  // ── MOCK MODE — no Stripe keys yet. Simulate a completed purchase so the
  //    whole post-payment chain (provision → status → batch → profile) and the
  //    success page can be exercised end to end. Requires a signed-in account.
  if (!isStripeConfigured()) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/voyager-pack', req.nextUrl.origin))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderErr } = await (admin.from('voyager_orders') as any)
      .insert({
        user_id: user.id,
        email: user.email,
        amount: PACK_PRICE_CENTS,
        currency: 'usd',
        status: 'paid',
        batch_label: batch,
        stripe_session_id: 'mock_' + Date.now(),
        paid_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (orderErr) console.error('[checkout/mock] order insert failed:', orderErr.message)

    const { error: provErr } = await provisionVoyagerMembership(user.id)
    if (provErr) console.error('[checkout/mock] provision failed:', provErr)

    // Always redirect back to the same origin (preview or production),
    // never follow NEXT_PUBLIC_SITE_URL which might point to a different deployment.
    return NextResponse.redirect(
      new URL(`/join/success?mock=1&order=${order?.id ?? ''}`, req.nextUrl.origin),
    )
  }

  // ── REAL STRIPE ──────────────────────────────────────────────────────────
  // Must be logged in so the order is immediately linked to an account.
  if (!user) {
    return NextResponse.redirect(new URL('/login?redirect=/voyager-pack', req.nextUrl.origin))
  }

  const stripe = getStripe()!

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (admin.from('voyager_orders') as any)
    .insert({
      user_id: user.id,
      email: user.email,
      amount: PACK_PRICE_CENTS,
      currency: 'usd',
      status: 'pending',
      batch_label: batch,
    })
    .select('id')
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    // $12 includes shipping; US addresses only.
    shipping_address_collection: { allowed_countries: ['US'] },
    // Let users enter coupon / promo codes at checkout.
    allow_promotion_codes: true,
    customer_email: user.email ?? undefined,
    metadata: { order_id: order?.id ?? '', user_id: user.id },
    success_url: `${origin}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/voyager-pack`,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('voyager_orders') as any)
    .update({ stripe_session_id: session.id })
    .eq('id', order?.id)

  return NextResponse.redirect(session.url!, { status: 303 })
}
