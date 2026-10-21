import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from './initiation-pricing'
import 'server-only'
import type { InitiationOrderKind } from '@/lib/initiation-types'
import { initiationPolicyError } from '@/lib/initiation-checkout-policy'
import { isStripeSecretKey } from '@/lib/stripe'

export function initiationConfigurationError(kind: InitiationOrderKind = 'standard'): string | null {
  if (process.env.INITIATION_PRICING_VERSION !== INITIATION_PRICING_VERSION) return 'The current bundle prices are not configured yet.'
  if (process.env.INITIATION_CHECKOUT_ENABLED !== 'true') return 'Initiation checkout is not open yet.'
  if (!isStripeSecretKey(process.env.STRIPE_SECRET_KEY) || !process.env.STRIPE_WEBHOOK_SECRET) return 'Payment configuration is incomplete.'
  const configuredPrices = Object.values(INITIATION_PRICES).map(offer => process.env[offer.priceEnv])
  if (configuredPrices.some(value => !value?.startsWith('price_')) || new Set(configuredPrices).size !== 3) return 'All three dedicated bundle prices must be configured.'
  const price = process.env[INITIATION_PRICES[kind].priceEnv]
  const product = process.env.STRIPE_INITIATION_PRODUCT_ID
  if (Object.entries(INITIATION_PRICES).some(([other, config]) => other !== kind && price && price === process.env[config.priceEnv])) return 'Each bundle requires a dedicated price.'
  if (!price?.startsWith('price_') || !product?.startsWith('prod_') || price === process.env.STRIPE_PRICE_ID) return 'The dedicated Initiation product is not configured.'
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
