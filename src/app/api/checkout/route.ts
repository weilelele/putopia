import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured, PACK_PRICE_CENTS } from '@/lib/stripe'
import { getCurrentBatch, provisionVoyagerMembership } from '@/lib/actions/membership'
import { getPostHogClient } from '@/lib/posthog-server'

export const dynamic = 'force-dynamic'

// Mirror the gate in /voyager-pack/page.tsx — keep in sync.
const SALES_OPEN = false

// GET /api/checkout — starts a purchase of the $12 Initial Voyager Pack.
//
// Auth + gating is handled here so /voyager-pack can be fully public:
//   0. Sales not open yet → redirect back to /voyager-pack
//   1. Not logged in      → redirect to /login (returns to /api/checkout)
//   2. task_gated group   → must complete Applicant tasks first
//   3. Otherwise          → proceed to Stripe (or mock) checkout
//
export async function GET(req: NextRequest) {
  // ── 0. Sales gate ─────────────────────────────────────────────────────────
  if (!SALES_OPEN) {
    return NextResponse.redirect(new URL('/voyager-pack', req.nextUrl.origin))
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── 1. Must be logged in ──────────────────────────────────────────────────
  if (!user) {
    // Redirect back to /api/checkout (not pack page) so the user doesn't
    // need to click "buy" a second time after logging in.
    return NextResponse.redirect(new URL('/login?redirect=/api/checkout', req.nextUrl.origin))
  }

  // ── 2. Experiment-group gate ──────────────────────────────────────────────
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('voyager_profiles')
    .select('experiment_group, task_quiz_at, task_intel_at')
    .eq('id', user.id)
    .single()

  // Payment-intent signal: the user clicked "buy" and reached checkout. Captured
  // before the task gate so the dashboard sees attempts that bounce on the gate.
  const ph = getPostHogClient()
  ph.capture({
    distinctId: user.id,
    event: 'voyager_checkout_initiated',
    properties: { experiment_group: profile?.experiment_group ?? 'none' },
  })

  if (profile?.experiment_group === 'task_gated') {
    const quiz = !!profile?.task_quiz_at

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: sightingCount } = await (admin as any)
      .from('worlds')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', user.id)
    const sighting = (sightingCount ?? 0) > 0

    // Promotion gate: a sighting + the assessment quiz only.
    if (!(quiz && sighting)) {
      // Tasks not yet complete — send them to the Path page to finish
      await ph.shutdown()
      return NextResponse.redirect(
        new URL('/dashboard-demo', req.nextUrl.origin)
      )
    }
  }
  await ph.shutdown()

  // ── 3a. MOCK MODE — simulate completed purchase end-to-end ────────────────
  const batch = await getCurrentBatch()

  if (!isStripeConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderErr } = await (admin as any)
      .from('voyager_orders')
      .insert({
        user_id:          user.id,
        email:            user.email,
        amount:           PACK_PRICE_CENTS,
        currency:         'usd',
        status:           'paid',
        batch_label:      batch,
        stripe_session_id: 'mock_' + Date.now(),
        paid_at:          new Date().toISOString(),
      })
      .select('id')
      .single()

    if (orderErr) console.error('[checkout/mock] order insert failed:', orderErr.message)

    const { error: provErr } = await provisionVoyagerMembership(user.id)
    if (provErr) console.error('[checkout/mock] provision failed:', provErr)

    // Land back on the homepage as a freshly-minted Voyager. The profile-
    // completion nudge (red dot on the avatar) appears there automatically
    // because a new Voyager has no avatar set yet.
    void order
    return NextResponse.redirect(
      new URL('/console?welcome=voyager', req.nextUrl.origin),
    )
  }

  // ── 3b. REAL STRIPE ───────────────────────────────────────────────────────
  const stripe = getStripe()!

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (admin as any)
    .from('voyager_orders')
    .insert({
      user_id:     user.id,
      email:       user.email,
      amount:      PACK_PRICE_CENTS,
      currency:    'usd',
      status:      'pending',
      batch_label: batch,
    })
    .select('id')
    .single()

  const session = await stripe.checkout.sessions.create({
    mode:       'payment',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    // $12 includes shipping; US addresses only.
    shipping_address_collection: { allowed_countries: ['US'] },
    // Let users enter coupon / promo codes at checkout.
    allow_promotion_codes: true,
    customer_email: user.email ?? undefined,
    metadata: { order_id: order?.id ?? '', user_id: user.id },
    success_url: `${origin}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/voyager-pack`,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('voyager_orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order?.id)

  return NextResponse.redirect(session.url!, { status: 303 })
}
