import { initiationShippingCountries } from '@/lib/initiation-checkout-policy'
import { deviceSourcePath } from '@/app/voyager-initiation/navigation'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { initiationConfigurationError } from '@/lib/initiation-config'
import { INITIATION_AMOUNT, INITIATION_UPGRADE_AMOUNT, INITIATION_PRODUCT } from '@/lib/initiation-types'

export const dynamic = 'force-dynamic'
/** Authenticated POST only. All purchase facts are resolved on the server. */
export async function POST(request: Request) {
  const configError = initiationConfigurationError()
  if (configError) return NextResponse.json({ error: configError }, { status: 503 })
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin
  if (request.headers.get('origin') !== origin) return NextResponse.json({ error: 'Invalid checkout origin.' }, { status: 403 })
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in before checkout.' }, { status: 401 })
  const stripe = getStripe()!
  try {
    // Resolve qualification before selecting a price; never accept amount/kind from the browser.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { data: legacyId, error: legacyError } = await admin.rpc('eligible_legacy_initiation_order', { p_user: user.id })
    if (legacyError) throw legacyError
    const kind = legacyId ? 'legacy_upgrade' : 'standard'
    const offerConfigError = initiationConfigurationError(kind)
    if (offerConfigError) return NextResponse.json({ error: offerConfigError }, { status: 503 })
    const priceId = kind === 'legacy_upgrade' ? process.env.STRIPE_INITIATION_UPGRADE_PRICE_ID! : process.env.STRIPE_INITIATION_PRICE_ID!
    const amount = kind === 'legacy_upgrade' ? INITIATION_UPGRADE_AMOUNT : INITIATION_AMOUNT
    const body = await request.json().catch(() => null)
    const deviceSource = deviceSourcePath(typeof body?.from === 'string' ? body.from : null)
    const productId = process.env.STRIPE_INITIATION_PRODUCT_ID!
    const { data: batch, error: batchError } = await admin.from('initiation_batches').select('stripe_livemode').eq('label', 'S26').single()
    if (batchError || !batch) throw new Error('Payment mode could not be verified')
    const price = await stripe.prices.retrieve(priceId)
    if (price.livemode !== batch.stripe_livemode || !price.active || price.type !== 'one_time' || price.unit_amount !== amount || price.currency !== 'usd' || price.product !== productId || price.tax_behavior !== 'inclusive') {
      return NextResponse.json({ error: 'The dedicated Initiation price is not ready.' }, { status: 503 })
    }
    const { data: order, error } = await admin.rpc('reserve_initiation', { p_user: user.id, p_price: priceId, p_product: productId, p_kind: kind, p_device_source: deviceSource })
    if (error || !order) return NextResponse.json({ error: 'Checkout is unavailable. Check calibration, existing orders, and seat availability on Initiation.' }, { status: 409 })
    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      if (session.metadata?.order_id !== order.id || session.metadata?.user_id !== user.id || session.metadata?.order_kind !== order.order_kind) throw new Error('Checkout binding mismatch')
      if (session.status === 'open' && session.url) return NextResponse.json({ url: session.url })
      return NextResponse.json({ error: 'Your previous payment is being reconciled. Return to Initiation for its status.' }, { status: 409 })
    }
    // This fixed reservation expiry and idempotency key survive retries/timeouts.
    const expiresAt = Math.floor(new Date(order.expires_at).getTime() / 1000)
    if (expiresAt < Math.floor(Date.now() / 1000) + 30 * 60) return NextResponse.json({ error: 'Your checkout reservation needs reconciliation. Please contact support.' }, { status: 409 })
    const sourceQuery = order.device_source ? `&from=${encodeURIComponent(order.device_source)}` : ''
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', ui_mode: 'hosted_page', payment_method_types: ['card'],
      automatic_tax: { enabled: false }, allow_promotion_codes: false,
      line_items: [{ price: order.price_id, quantity: 1 }],
      client_reference_id: user.id, customer_email: user.email,
      metadata: { product_type: INITIATION_PRODUCT, order_kind: order.order_kind, order_id: order.id, user_id: user.id, batch: 'S26', capture_policy: 'contiguous_us_manual_v1' },
      payment_intent_data: { capture_method: 'manual', metadata: { product_type: INITIATION_PRODUCT, order_kind: order.order_kind, order_id: order.id } },
      shipping_address_collection: { allowed_countries: initiationShippingCountries(process.env.INITIATION_SHIPPING_COUNTRIES)! as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] },
      consent_collection: { terms_of_service: 'required' },
      custom_text: { shipping_address: { message: 'Delivery to the contiguous United States (48 states and Washington, DC) only. Shipping and applicable taxes are included.' }, submit: { message: 'Your card is authorized first. We charge only after delivery-region verification; unsupported addresses have the authorization canceled. A temporary bank hold may appear.' }, terms_of_service_acceptance: { message: `I accept the [Initiation terms](${process.env.INITIATION_TERMS_URL}).` } },
      expires_at: expiresAt,
      success_url: `${origin}/join/success?product=initiation&session_id={CHECKOUT_SESSION_ID}${sourceQuery}`,
      cancel_url: `${origin}/voyager-initiation?checkout=canceled${sourceQuery}`,
    }, { idempotencyKey: `initiation:${order.id}` })
    const { error: bindError } = await admin.from('initiation_orders').update({ stripe_session_id: session.id }).eq('id', order.id).is('stripe_session_id', null)
    if (bindError) throw bindError
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[initiation-checkout] Checkout could not be created:', error instanceof Error ? error.message : 'unknown')
    // Do not release an ambiguous Stripe create: it may have succeeded remotely.
    return NextResponse.json({ error: 'Checkout could not be confirmed. Please try again; your existing reservation will be reused.' }, { status: 503 })
  }
}
