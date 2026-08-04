import { type NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  DEVICE_ORDER_PRODUCT_TYPE,
  getDeviceCheckoutExpiration,
  getDeviceCheckoutDetailsForBatch,
} from '@/lib/device-checkout'
import { getPublicDeviceBatch } from '@/lib/device-batch-repository'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type CheckoutBody = {
  batchSlug?: unknown
}

type ExistingOrder = {
  id: string
  status: string
  stripe_session_id: string | null
}

function checkoutOrigin(req: NextRequest) {
  if (req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1') {
    return req.nextUrl.origin
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
}

function shippingCountries(): Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] {
  const configured = process.env.DEVICE_SHIPPING_COUNTRIES
    ?.split(',')
    .map((country) => country.trim().toUpperCase())
    .filter((country) => /^[A-Z]{2}$/.test(country))

  return (configured?.length ? configured : ['US']) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[]
}

export async function POST(req: NextRequest) {
  let body: CheckoutBody
  try {
    body = (await req.json()) as CheckoutBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const batchSlug = typeof body.batchSlug === 'string' ? body.batchSlug.trim() : ''
  const batchRecord = await getPublicDeviceBatch(batchSlug)
  if (!batchRecord) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }
  const checkout = getDeviceCheckoutDetailsForBatch(batchRecord)
  if (!checkout.ok) {
    return NextResponse.json({ error: checkout.error }, { status: checkout.status })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.role === 'guest') {
    return NextResponse.json({ error: 'Applicant status required' }, { status: 403 })
  }

  const stripe = getStripe()
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Device checkout is not configured' },
      { status: 503 },
    )
  }

  const admin = createAdminClient()
  const { batch, amount, currency } = checkout.details
  const checkoutExpiresAt = getDeviceCheckoutExpiration()

  // Reuse an unfinished Stripe Session when possible. This avoids creating a
  // second hold if someone double taps the CTA or returns after closing Stripe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeOrder } = await (admin.from('voyager_orders') as any)
    .select('id, status, stripe_session_id')
    .eq('user_id', user.id)
    .eq('product_type', DEVICE_ORDER_PRODUCT_TYPE)
    .eq('device_batch_slug', batch.slug)
    .in('status', [
      'pending',
      'payment_review',
      'paid',
      'preparing',
      'shipped',
      'delivered',
    ])
    .maybeSingle()

  const existing = activeOrder as ExistingOrder | null
  if (existing?.status !== 'pending') {
    if (existing) {
      return NextResponse.json(
        { error: 'You already hold a claim for this batch' },
        { status: 409 },
      )
    }
  } else if (existing.stripe_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(existing.stripe_session_id)
      if (session.status === 'open' && session.url) {
        return NextResponse.json({ url: session.url, reused: true })
      }
      if (session.status === 'complete') {
        return NextResponse.json(
          { error: 'Your payment is being confirmed' },
          { status: 409 },
        )
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('voyager_orders') as any)
        .update({ status: 'canceled' })
        .eq('id', existing.id)
        .eq('status', 'pending')
    } catch (error) {
      console.error('[device-checkout] could not reuse session:', error)
      return NextResponse.json(
        { error: 'Could not resume the existing checkout' },
        { status: 502 },
      )
    }
  } else if (existing) {
    // A previous attempt failed before its Stripe Session was attached.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('voyager_orders') as any)
      .update({ status: 'canceled' })
      .eq('id', existing.id)
      .eq('status', 'pending')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (admin.from('voyager_orders') as any)
    .insert({
      user_id: user.id,
      email: user.email,
      amount,
      currency,
      status: 'pending',
      batch_label: batch.name,
      product_type: DEVICE_ORDER_PRODUCT_TYPE,
      device_batch_slug: batch.slug,
      device_batch_code: batch.code,
      pack_count: batch.distributionStages.length,
      checkout_expires_at: checkoutExpiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (orderError || !order?.id) {
    const duplicate = orderError?.code === '23505'
    const inventoryConflict =
      orderError?.message.includes('fully claimed') === true
    const claimsClosed =
      orderError?.message.includes('claims are not open') === true
    return NextResponse.json(
      {
        error: duplicate
          ? 'A checkout for this batch is already active'
          : inventoryConflict
            ? 'This batch is fully claimed'
            : claimsClosed
              ? 'Claims are not open for this batch'
              : 'Could not create the order',
      },
      { status: duplicate || inventoryConflict || claimsClosed ? 409 : 500 },
    )
  }

  const origin = checkoutOrigin(req)
  const metadata = {
    order_id: order.id as string,
    user_id: user.id,
    product_type: DEVICE_ORDER_PRODUCT_TYPE,
    batch_slug: batch.slug,
    batch_code: batch.code,
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: order.id as string,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: `${batch.name} · ${batch.code}`,
              description: `${batch.distributionStages.length} distribution packs, including the assigned Multiverse Console.`,
              metadata: {
                product_type: DEVICE_ORDER_PRODUCT_TYPE,
                batch_slug: batch.slug,
              },
            },
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: { allowed_countries: shippingCountries() },
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(checkoutExpiresAt.getTime() / 1000),
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/devices/claim/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/devices/claim?batch=${encodeURIComponent(batch.slug)}&checkout=cancelled`,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: attachError } = await (admin.from('voyager_orders') as any)
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)
    if (attachError) {
      console.error('[device-checkout] session attachment failed:', attachError.message)
    }

    if (!session.url) throw new Error('Stripe did not return a Checkout URL')
    return NextResponse.json({ url: session.url }, { status: 201 })
  } catch (error) {
    console.error('[device-checkout] Stripe Session creation failed:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('voyager_orders') as any)
      .update({ status: 'canceled' })
      .eq('id', order.id)
      .eq('status', 'pending')
    return NextResponse.json({ error: 'Could not start secure checkout' }, { status: 502 })
  }
}
