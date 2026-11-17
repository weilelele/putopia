import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { deviceSourcePath } from '@/app/voyager-initiation/navigation'
import { createAdminClient } from './supabase/server'
import { requestClientIp, captureInitiationMetaAttribution } from './initiation-meta-attribution'
import { sanitizeInitiationAnalytics } from './initiation-analytics'
import { INITIATION_PRICES } from './initiation-pricing'
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
  body: Record<string,unknown> | null, path: InitiationCheckoutPath, kind: 'initial'|'standard') {
  const email = user.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'An email is required for checkout.' }, { status: 400 })
  const variantId = config[kind]
  const deviceSource = deviceSourcePath(typeof body?.from === 'string' ? body.from : null)
  const admin = createAdminClient()
  const reservation = await admin.rpc('reserve_initiation_shopify_v2' as never, {
    p_user: user.id, p_shop: config.shop, p_variant_id: variantId, p_email: email, p_kind: kind, p_device_source: deviceSource,
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
  const order = reservation.data as { id:string; amount:number } | null
  if (!order?.id || order.amount !== INITIATION_PRICES[kind].amount) throw new Error('Shopify reservation quote did not match')
  const ready = (url: URL) => {
    afterCheckout(() => sendPendingInitiationAnalytics(admin, null, { orderId: order.id, limit: 2 }),
      '[initiation-analytics] Shopify checkout analytics deferred to the outbox')
    return NextResponse.json({ url: url.href })
  }

  const readSavedUrl = async () => {
    const saved = await admin.from('initiation_shopify_checkouts' as never).select('checkout_url').eq('order_id',order.id).single()
    if (saved.error) throw saved.error
    const raw = (saved.data as {checkout_url: string|null} | null)?.checkout_url
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
  const reference = shopifyLiveReservationReference({ shop:config.shop, id:order.id, userId:user.id, kind, variantId, email },config.clientSecret)
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
      buyerIdentity:{email,countryCode:'US'},
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
