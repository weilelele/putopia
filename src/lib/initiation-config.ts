import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from './initiation-pricing'
import 'server-only'
import type { InitiationOrderKind } from '@/lib/initiation-types'
import { initiationPolicyError } from '@/lib/initiation-checkout-policy'
import { isStripeSecretKey } from '@/lib/stripe'

export function initiationStripeQuote(
  kind: InitiationOrderKind,
  previous?: { status: string; order_kind: InitiationOrderKind; pricing_version: string | null; price_id: string; product_id: string } | null,
  env: Record<string, string | undefined> = process.env,
) {
  // The reservation RPC requires the original quote when a customer retries a pending order.
  if (previous?.status === 'pending' && previous.order_kind === kind && previous.pricing_version === INITIATION_PRICING_VERSION) {
    return { priceId: previous.price_id, productId: previous.product_id }
  }
  const completePrice = env.STRIPE_INITIATION_COMPLETE_PRICE_ID
  const completeProduct = env.STRIPE_INITIATION_COMPLETE_PRODUCT_ID
  if (kind === 'standard' && (completePrice || completeProduct)) {
    return { priceId: completePrice, productId: completeProduct }
  }
  return {
    priceId: env[INITIATION_PRICES[kind].priceEnv],
    productId: env.STRIPE_INITIATION_PRODUCT_ID,
  }
}

export function initiationConfigurationError(kind: InitiationOrderKind = 'standard'): string | null {
  if (process.env.INITIATION_PRICING_VERSION !== INITIATION_PRICING_VERSION) return 'The current bundle prices are not configured yet.'
  if (process.env.INITIATION_CHECKOUT_ENABLED !== 'true') return 'Initiation checkout is not open yet.'
  if (!isStripeSecretKey(process.env.STRIPE_SECRET_KEY) || !process.env.STRIPE_WEBHOOK_SECRET) return 'Payment configuration is incomplete.'
  const configuredPrices = (Object.keys(INITIATION_PRICES) as InitiationOrderKind[]).map(offer => initiationStripeQuote(offer).priceId)
  if (configuredPrices.some(value => !value?.startsWith('price_')) || new Set(configuredPrices).size !== 3) return 'All three dedicated bundle prices must be configured.'
  const { priceId, productId } = initiationStripeQuote(kind)
  if (!priceId?.startsWith('price_') || !productId?.startsWith('prod_') || priceId === process.env.STRIPE_PRICE_ID) return 'The dedicated Initiation product is not configured.'
  return initiationPolicyError({
    termsApproved: process.env.INITIATION_TERMS_APPROVED,
    fulfillmentApproved: process.env.INITIATION_FULFILLMENT_POLICY_APPROVED,
    shippingPolicy: process.env.INITIATION_SHIPPING_POLICY,
    taxPolicy: process.env.INITIATION_TAX_POLICY,
    countries: process.env.INITIATION_SHIPPING_COUNTRIES,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    termsUrl: process.env.INITIATION_TERMS_URL,
  })
}
