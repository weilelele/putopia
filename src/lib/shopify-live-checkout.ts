import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { deviceSourcePath } from '@/app/voyager-initiation/navigation'
import { createAdminClient } from './supabase/server'
import { requestClientIp, captureInitiationMetaAttribution } from './initiation-meta-attribution'
import { sanitizeInitiationAnalytics } from './initiation-analytics'
import { isInitiationOrderAmount, type InitiationOrderKind } from './initiation-pricing'
import { shopifyApiVersion, shopifyPilotRequest } from './shopify-bundle-pilot'
import { shopifyLiveCheckoutAttribute, shopifyLiveReservationReference } from './shopify-live-order'
import { type shopifyLiveConfig } from './shopify-live-config'
import { shopifyLiveCheckoutUrl } from './shopify-checkout-url'
import type { InitiationCheckoutPath } from './initiation-checkout-session'
import { afterCheckout } from './checkout-after'
import { sendPendingInitiationAnalytics } from './initiation-analytics-outbox'

type Config = NonNullable<ReturnType<typeof shopifyLiveConfig>>
type CartResult = {
  data?: { cartCreate: { cart: { checkoutUrl: string; cost: { subtotalAmount: { currencyCode: string; amount: string } } } | null; userErrors: unknown[] } }
  errors?: unknown[]
}

export async function createShopifyLiveCheckout(config: Config, request: Request, origin: string, user: {id:string;email?:string},
  body: Record<string,unknown> | null, path: InitiationCheckoutPath, kind: 'membership'|'initial'|'standard') {
  const email = user.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'An email is required for checkout.' }, { status: 400 })
  const membershipEnabled = process.env.INITIATION_MEMBERSHIP_ENABLED === 'true'
  const admin = createAdminClient()
  let membershipId: string | null = null
  let initialId: string | null = null
  let legacyId: string | null = null
  if (membershipEnabled) {
    const sources = await Promise.all([
      admin.rpc('eligible_voyager_membership_order' as never, { p_user: user.id } as never),
      admin.rpc('eligible_initial_initiation_order' as never, { p_user: user.id } as never),
      admin.rpc('eligible_legacy_initiation_order' as never, { p_user: user.id } as never),
    ])
    if (sources.some(source => source.error)) throw new Error('Upgrade qualification is unavailable')
    ;[membershipId, initialId, legacyId] = sources.map(source => source.data as string | null)
    if (body?.afterSignIn === true && (membershipId || initialId || legacyId)) return NextResponse.json({ next: 'refresh' })
  }
  const upgrade = !!initialId || !!legacyId
  const variantId = upgrade ? config.upgrade : kind === 'membership' ? config.membership
    : membershipId ? kind === 'initial' ? config.membershipInitial : config.membershipComplete : config[kind]
  if (!variantId) return NextResponse.json({ error: 'This Shopify offer is not configured yet.' }, { status: 503 })
  const deviceSource = deviceSourcePath(typeof body?.from === 'string' ? body.from : null)
  const reservation = await admin.rpc((membershipEnabled ? 'reserve_initiation_shopify_v3' : 'reserve_initiation_shopify_v2') as never, {
    p_user: user.id, p_shop: config.shop, p_variant_id: variantId, p_email: email, ...(membershipEnabled ? { p_target: kind } : { p_kind: kind }), p_device_source: deviceSource,
  } as never)
  if (reservation.error) {
    if (reservation.error.code !== 'P0001') throw reservation.error
    const error = reservation.error.message === 'An existing payment must finish reconciliation'
      ? 'An existing payment is being confirmed. Refresh to check its status before starting another payment.'
      : reservation.error.message === 'S26 seats are fully reserved'
        ? 'All S26 seats are currently allocated or reserved.'
        : 'Checkout is unavailable. Refresh Initiation and try again.'
    return NextResponse.json({ error }, { status: 409 })
  }
  const order = reservation.data as { id: string; amount: number; order_kind: InitiationOrderKind; pricing_version: string | null; membership_order_id: string | null; initial_order_id: string | null } | null
  if (!order?.id || !isInitiationOrderAmount(order)) throw new Error('Shopify reservation quote did not match')
  const ready = (url: URL) => {
    afterCheckout(() => sendPendingInitiationAnalytics(admin, null, { orderId: order.id, limit: 2 }),
      '[initiation-analytics] Shopify checkout analytics deferred to the outbox')
    return NextResponse.json({ url: url.href })
  }

  let referenceVersion = membershipEnabled ? 2 : 1
  const readSavedUrl = async () => {
    const saved = await admin.from('initiation_shopify_checkouts' as never).select('checkout_url,reference_version').eq('order_id',order.id).single()
    if (saved.error) throw saved.error
    const checkout = saved.data as { checkout_url: string | null; reference_version: number } | null
    referenceVersion = checkout?.reference_version ?? referenceVersion
    const raw = checkout?.checkout_url
    return raw ? shopifyLiveCheckoutUrl(raw) : null
  }
  const existing = await readSavedUrl()
  if (existing) return ready(existing)

  const cookieStore = await cookies()
  const attribution = captureInitiationMetaAttribution(request.headers,name=>cookieStore.get(name)?.value,origin)
  const savedAttribution = await admin.rpc('save_initiation_checkout_attribution' as never, {
    p_order:order.id,p_user:user.id,p_meta:attribution,p_analytics:{
      ...sanitizeInitiationAnalytics(body?.analytics),environment:process.env.VERCEL_ENV,checkout_path:path,
    },
  } as never)
  if (savedAttribution.error) throw savedAttribution.error
  const reference = shopifyLiveReservationReference({ shop:config.shop, id:order.id, userId:user.id, kind: order.order_kind, variantId, email,
    amount: order.amount, pricingVersion: order.pricing_version, membershipOrderId: order.membership_order_id,
    initialOrderId: order.initial_order_id, referenceVersion },config.clientSecret)
  const buyerIp = requestClientIp(request.headers)
  const result = await shopifyPilotRequest<CartResult>(`https://${config.shop}/api/${shopifyApiVersion}/graphql.json`, {
    'Content-Type':'application/json',...config.storefrontAuth,
    ...(buyerIp && {'Shopify-Storefront-Buyer-IP':buyerIp}),
  }, JSON.stringify({
    query:`mutation StartPutopiaCheckout($input:CartInput!){
      cartCreate(input:$input){cart{checkoutUrl cost{subtotalAmount{amount currencyCode}}} userErrors{field}}
    }`,
    variables:{input:{
      lines:[{merchandiseId:variantId,quantity:1}],
      buyerIdentity:{email,...(kind !== 'membership' && {countryCode:'US'})},
      attributes:[{key:shopifyLiveCheckoutAttribute,value:reference}],
    }},
  }))
  const cart = result.data?.cartCreate.cart
  const url = cart && shopifyLiveCheckoutUrl(cart.checkoutUrl)
  if (result.errors?.length || result.data?.cartCreate.userErrors.length || !url || cart?.cost.subtotalAmount.currencyCode!=='USD'
    || Number(cart.cost.subtotalAmount.amount)*100!==order.amount) throw new Error('Shopify checkout quote did not match')
  const bound = await admin.from('initiation_shopify_checkouts' as never).update({checkout_url:url.href} as never)
    .eq('order_id',order.id).is('checkout_url',null).select('checkout_url').maybeSingle()
  if (bound.error) throw bound.error
  const selected = bound.data ? url : await readSavedUrl()
  if (!selected) throw new Error('Could not save the Shopify checkout URL')
  return ready(selected)
}
