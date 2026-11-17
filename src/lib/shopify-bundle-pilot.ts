import 'server-only'
import { createHmac } from 'node:crypto'

export const pilotCheckoutAttribute = '_putopia_checkout'
export const shopifyApiVersion = '2026-10'

export function shopifyPilotOffer(kind: 'initial' | 'standard') {
  if (process.env.NODE_ENV !== 'development') return null
  const { NEXT_PUBLIC_SUPABASE_URL, SHOPIFY_PILOT_SHOP, SHOPIFY_PILOT_CLIENT_ID, SHOPIFY_PILOT_CLIENT_SECRET,
    SHOPIFY_INITIAL_PILOT_VARIANT_ID,
    SHOPIFY_COMPLETE_PILOT_VARIANT_ID,
    SHOPIFY_INITIAL_PILOT_DRAFT_URL, SHOPIFY_COMPLETE_PILOT_DRAFT_URL,
    SHOPIFY_PILOT_STOREFRONT_TOKEN } = process.env
  if (!NEXT_PUBLIC_SUPABASE_URL || !/^http:\/\/127\.0\.0\.1:\d{1,5}\/?$/.test(NEXT_PUBLIC_SUPABASE_URL)
    || !SHOPIFY_PILOT_SHOP || !/^[a-z0-9-]+\.myshopify\.com$/.test(SHOPIFY_PILOT_SHOP)
    || !SHOPIFY_PILOT_CLIENT_ID || !SHOPIFY_PILOT_CLIENT_SECRET) return null

  const pilot = kind === 'initial'
    ? { variantId: SHOPIFY_INITIAL_PILOT_VARIANT_ID, draftUrl: SHOPIFY_INITIAL_PILOT_DRAFT_URL, amount: 38 }
    : { variantId: SHOPIFY_COMPLETE_PILOT_VARIANT_ID, draftUrl: SHOPIFY_COMPLETE_PILOT_DRAFT_URL, amount: 488 }
  if (!pilot.variantId || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(pilot.variantId)) return null
  const draft = pilot.draftUrl ? URL.parse(pilot.draftUrl) : null
  if (pilot.draftUrl && (!draft || draft.origin !== `https://${SHOPIFY_PILOT_SHOP}`
    || !/^\/\d+\/invoices\/[a-z0-9]+$/i.test(draft.pathname) || draft.search || draft.hash
    || draft.username || draft.password)) return null

  return {
    kind,
    amount: pilot.amount,
    variantId: pilot.variantId,
    draftUrl: draft?.href,
    shop: SHOPIFY_PILOT_SHOP,
    storefrontToken: SHOPIFY_PILOT_STOREFRONT_TOKEN,
    clientId: SHOPIFY_PILOT_CLIENT_ID,
    clientSecret: SHOPIFY_PILOT_CLIENT_SECRET,
  }
}

export function shopifyBundlePilotConfig(userId: string | null | undefined) {
  if (!userId) return null
  const kind = userId === process.env.SHOPIFY_INITIAL_PILOT_USER_ID ? 'initial'
    : userId === process.env.SHOPIFY_COMPLETE_PILOT_USER_ID ? 'standard' : null
  const offer = kind && shopifyPilotOffer(kind)
  if (!offer) return null
  return {
    ...offer,
    reference: createHmac('sha256', offer.clientSecret)
      .update(`${offer.shop}:${userId}:${offer.variantId}`).digest('hex'),
  }
}

export type ShopifyPilotOffer = NonNullable<ReturnType<typeof shopifyPilotOffer>>

export function pilotBuyerEmail(user: { email?: string; email_confirmed_at?: string } | null | undefined) {
  const email = user?.email?.toLowerCase()
  return user?.email_confirmed_at && email && /^[a-z0-9.-]+@example\.com$/.test(email) ? email : null
}

export async function shopifyPilotRequest<T>(url: string, headers: Record<string, string>, body: string | URLSearchParams): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(12000), cache: 'no-store' })
  if (!response.ok) throw new Error(`Shopify HTTP ${response.status}`)
  return response.json() as Promise<T>
}

type CartResult = {
  data?: { cartCreate: { cart: { checkoutUrl: string; cost: { subtotalAmount: { amount: string; currencyCode: string } } } | null } }
  errors?: { message: string }[]
}

export async function createShopifyPilotCheckout(config: ShopifyPilotOffer, email: string, reference: string) {
  const result = await shopifyPilotRequest<CartResult>(`https://${config.shop}/api/${shopifyApiVersion}/graphql.json`, {
    'Content-Type': 'application/json',
    ...(config.storefrontToken && { 'Shopify-Storefront-Private-Token': config.storefrontToken }),
  }, JSON.stringify({
    query: `mutation PutopiaPilotCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart { checkoutUrl cost { subtotalAmount { amount currencyCode } } }
        userErrors { code message }
      }
    }`,
    variables: { input: {
      lines: [{ merchandiseId: config.variantId, quantity: 1 }],
      buyerIdentity: { email, countryCode: 'US' },
      attributes: [{ key: pilotCheckoutAttribute, value: reference }],
    } },
  }))
  const cart = result.data?.cartCreate.cart
  const amount = cart?.cost.subtotalAmount
  const checkout = URL.parse(cart?.checkoutUrl ?? '')
  if (result.errors?.length || amount?.currencyCode !== 'USD' || Number(amount?.amount) !== config.amount
    || !checkout || checkout.origin !== `https://${config.shop}` || !checkout.pathname.startsWith('/cart/c/')
    || checkout.username || checkout.password) throw new Error('Unexpected Shopify bundle cart')
  return checkout.href
}
