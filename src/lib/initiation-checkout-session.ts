import 'server-only'
import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from '@/lib/initiation-pricing'
import { initiationShippingCountries } from '@/lib/initiation-checkout-policy'
import { deviceSourcePath, initiationReturnPath } from '@/app/voyager-initiation/navigation'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { initiationConfigurationError } from '@/lib/initiation-config'
import { INITIATION_PRODUCT } from '@/lib/initiation-types'
import { captureInitiationMetaAttribution } from '@/lib/initiation-meta-attribution'
import { sanitizeInitiationAnalytics } from '@/lib/initiation-analytics'
import { queueInitiationCheckoutAnalytics, sendPendingInitiationAnalytics, validInitiationAnalyticsSession } from '@/lib/initiation-analytics-outbox'
import { prepareInitiationBundleSwitch } from '@/lib/initiation-checkout-switch'
import { afterCheckout } from '@/lib/checkout-after'

/** How the buyer reached checkout: signed in, or an email-only account created by the email checkout. */
export type InitiationCheckoutPath = 'signed_in' | 'email_first'

/**
 * Reserves a seat for `user` and returns the Stripe Checkout URL. Callers resolve the user and the site origin;
 * every purchase fact (kind, price, amount) is resolved here on the server.
 */
export async function createInitiationCheckout(request: Request, origin: string, user: { id: string; email?: string }, body: Record<string, unknown> | null, checkoutPath: InitiationCheckoutPath) {
  const started = performance.now()
  let previousMark = started
  const timings: string[] = []
  const mark = (name: string) => { const now = performance.now(); timings.push(`${name};dur=${(now - previousMark).toFixed(1)}`); previousMark = now }
  const stripe = getStripe()!
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const ready = (url: string, orderId: string, reused: boolean) => {
      // Binding the Session durably enqueues the initial event in SQL. Retry delivery after the redirect.
      afterCheckout(async () => {
        if (reused) await queueInitiationCheckoutAnalytics(admin, orderId, true)
        await sendPendingInitiationAnalytics(admin, stripe, { orderId, limit: 2 })
      }, '[initiation-analytics] Checkout analytics deferred to the outbox')
      timings.push(`checkout_total;dur=${(performance.now() - started).toFixed(1)}`)
      console.info('[initiation-checkout] Ready', { path: checkoutPath, reused, timing: timings.join(', ') })
      return NextResponse.json({ url }, { headers: { 'Server-Timing': timings.join(', ') } })
    }
    // Resolve qualification before selecting a price; never accept amount/kind from the browser.
    if (body?.bundle !== undefined && !['initial', 'standard'].includes(body.bundle as string)) return NextResponse.json({ error: 'Choose a valid bundle.' }, { status: 400 })
    const [legacyResult, initialResult, batchResult, previousResult, profileResult] = await Promise.all([
      admin.rpc('eligible_legacy_initiation_order', { p_user: user.id }),
      admin.rpc('eligible_initial_initiation_order', { p_user: user.id }),
      admin.from('initiation_batches').select('stripe_livemode').eq('label', 'S26').single(),
      admin.from('initiation_orders').select('*').eq('user_id', user.id).in('status', ['pending', 'payment_review', 'disputed']).maybeSingle(),
      admin.from('voyager_profiles').select('role').eq('id', user.id).maybeSingle(),
    ])
    mark('lookup')
    const { data: legacyId, error: legacyError } = legacyResult
    if (legacyError) throw legacyError
    const { data: initialId, error: initialError } = initialResult
    if (initialError) throw initialError
    if ((legacyId || initialId) && body?.bundle === 'initial') return NextResponse.json({ error: 'Your Initial Pack is already owned. Choose the upgrade.' }, { status: 409 })
    const kind = legacyId || initialId ? 'legacy_upgrade' : body?.bundle === 'initial' ? 'initial' : 'standard'
    const offerConfigError = initiationConfigurationError(kind)
    if (offerConfigError) return NextResponse.json({ error: offerConfigError }, { status: 503 })
    const priceId = process.env[INITIATION_PRICES[kind].priceEnv]!
    const amount = INITIATION_PRICES[kind].amount
    const deviceSource = deviceSourcePath(typeof body?.from === 'string' ? body.from : null)
    const productId = process.env.STRIPE_INITIATION_PRODUCT_ID!
    const { data: batch, error: batchError } = batchResult
    if (batchError || !batch) throw new Error('Payment mode could not be verified')
    const price = await stripe.prices.retrieve(priceId)
    mark('price')
    if (price.livemode !== batch.stripe_livemode || !price.active || price.type !== 'one_time' || price.unit_amount !== amount || price.currency !== 'usd' || price.product !== productId || price.tax_behavior !== 'inclusive') {
      return NextResponse.json({ error: 'The dedicated Initiation price is not ready.' }, { status: 503 })
    }
    const { data: previousOrder, error: previousError } = previousResult
    if (previousError) throw previousError
    const canSwitch = await prepareInitiationBundleSwitch(previousOrder, kind, {
      retrieveSession: id => stripe.checkout.sessions.retrieve(id),
      expireSession: id => stripe.checkout.sessions.expire(id),
      retrieveIntent: id => stripe.paymentIntents.retrieve(id),
      cancelOrder: async previous => {
        const { data, error: cancelError } = await admin.from('initiation_orders').update({ status: 'canceled' })
          .eq('id', previous.id).eq('user_id', user.id).eq('status', 'pending')
          .eq('stripe_session_id', previous.stripe_session_id).is('paid_at', null).is('stripe_payment_intent', null).select('id')
        if (cancelError) throw cancelError
        return data.length === 1
      },
    })
    if (!canSwitch) return NextResponse.json({ error: 'Your previous checkout is still being confirmed. Please retry your original bundle or refresh to check payment status before switching.' }, { status: 409 })
    const { data: order, error } = await admin.rpc('reserve_initiation_v2', { p_user: user.id, p_price: priceId, p_product: productId, p_kind: kind, p_device_source: deviceSource })
    mark('reservation')
    if (error || !order) return NextResponse.json({ error: 'Checkout is unavailable. Check existing orders and seat availability on Initiation.' }, { status: 409 })
    if (order.amount !== amount || order.pricing_version !== INITIATION_PRICING_VERSION) throw new Error('Reserved quote does not match the current bundle')
    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      mark('stripe_session')
      if (!validInitiationAnalyticsSession(order, session)) throw new Error('Checkout binding mismatch')
      if (session.status === 'open' && session.url && new URL(session.url).protocol === 'https:') {
        return ready(session.url, order.id, true)
      }
      return NextResponse.json({ error: 'Your previous payment is being reconciled. Return to Initiation for its status.' }, { status: 409 })
    }
    // This fixed reservation expiry and idempotency key survive retries/timeouts.
    const expiresAt = Math.floor(new Date(order.expires_at).getTime() / 1000)
    if (expiresAt < Math.floor(Date.now() / 1000) + 30 * 60) return NextResponse.json({ error: 'Your checkout reservation needs reconciliation. Please contact support.' }, { status: 409 })
    const cookieStore = await cookies()
    const attribution = captureInitiationMetaAttribution(request.headers, name => cookieStore.get(name)?.value, origin)
    // Preserve the first checkout's browser attribution across retries and races.
    // Saving before Stripe creation also covers a webhook winning session binding.
    const { error: attributionError } = await admin.from('initiation_orders').update({ meta_attribution: attribution })
      .eq('id', order.id).eq('status', 'pending').is('stripe_session_id', null).eq('meta_attribution', '{}')
    if (attributionError) throw attributionError
    try {
      const analyticsContext = sanitizeInitiationAnalytics(body?.analytics)
      const { data: profile, error: profileError } = profileResult
      const { error: analyticsError } = await admin.from('initiation_orders').update({ analytics_context: {
        ...analyticsContext, is_internal_qa: analyticsContext.is_internal_qa === true || profile?.role === 'architect' || !!profileError || !profile,
        environment: process.env.VERCEL_ENV ?? 'unknown', checkout_path: checkoutPath,
      } }).eq('id', order.id).is('stripe_session_id', null).eq('analytics_context', '{}')
      if (analyticsError) throw analyticsError
    } catch { console.warn('[initiation-analytics] Attribution could not be saved; unknown environment remains excluded') }
    mark('attribution')
    const sourceQuery = order.device_source ? `&from=${encodeURIComponent(order.device_source)}` : ''
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', ui_mode: 'hosted_page', payment_method_types: ['card'],
      automatic_tax: { enabled: false }, allow_promotion_codes: false,
      line_items: [{ price: order.price_id, quantity: 1 }],
      client_reference_id: user.id, customer_email: user.email,
      metadata: { product_type: INITIATION_PRODUCT, order_kind: order.order_kind, order_id: order.id, user_id: user.id, batch: 'S26', pricing_version: order.pricing_version, capture_policy: 'contiguous_us_manual_v1' },
      payment_intent_data: { capture_method: 'manual', metadata: { product_type: INITIATION_PRODUCT, order_kind: order.order_kind, order_id: order.id } },
      shipping_address_collection: { allowed_countries: initiationShippingCountries(process.env.INITIATION_SHIPPING_COUNTRIES)! as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] },
      consent_collection: { terms_of_service: 'required' },
      custom_text: { shipping_address: { message: 'Delivery to the contiguous United States (48 states and Washington, DC) only. Shipping and applicable taxes are included.' }, submit: { message: 'Your card is authorized first. We charge only after delivery-region verification; unsupported addresses have the authorization canceled. A temporary bank hold may appear.' }, terms_of_service_acceptance: { message: `I accept the [Initiation terms](${process.env.INITIATION_TERMS_URL}).` } },
      expires_at: expiresAt,
      success_url: `${origin}/join/success?product=initiation&session_id={CHECKOUT_SESSION_ID}${sourceQuery}`,
      cancel_url: `${origin}${initiationReturnPath(order.device_source, order.order_kind === 'initial' ? 'initial' : 'standard')}&checkout=canceled`,
    }, { idempotencyKey: `initiation:${order.id}` })
    mark('stripe_session')
    if (!validInitiationAnalyticsSession({ ...order, stripe_session_id: session.id }, session) || session.status !== 'open'
      || !session.url || new URL(session.url).protocol !== 'https:') throw new Error('Checkout binding mismatch')
    const { error: bindError } = await admin.from('initiation_orders').update({ stripe_session_id: session.id }).eq('id', order.id).is('stripe_session_id', null)
    if (bindError) throw bindError
    mark('binding')
    return ready(session.url, order.id, false)
  } catch (error) {
    console.error('[initiation-checkout] Checkout could not be created:', error instanceof Error ? error.message : 'unknown')
    // Do not release an ambiguous Stripe create: it may have succeeded remotely.
    return NextResponse.json({ error: 'Checkout could not be confirmed. Please try again; your existing reservation will be reused.' }, { status: 503 })
  }
}
