import 'server-only'
import type { InitiationOrderKind } from '@/lib/initiation-types'
import { initiationPolicyError } from '@/lib/initiation-checkout-policy'
import { isStripeSecretKey } from '@/lib/stripe'
import { initiationOffer } from './initiation-offers'

export function initiationConfigurationError(kind: InitiationOrderKind = 'standard'): string | null {
  if (process.env.INITIATION_CHECKOUT_ENABLED !== 'true') return 'Initiation checkout is not open yet.'
  if (!isStripeSecretKey(process.env.STRIPE_SECRET_KEY) || !process.env.STRIPE_WEBHOOK_SECRET) return 'Payment configuration is incomplete.'
  if ((kind === 'initial' || kind === 'initial_upgrade') && process.env.INITIATION_BUNDLES_ENABLED !== 'true') return 'Initial Pack checkout is not open yet.'
  const offer = initiationOffer(kind)
  const price = offer ? process.env[offer.priceEnv] : undefined
  const product = process.env.STRIPE_INITIATION_PRODUCT_ID
  if (kind === 'legacy_upgrade' && price === process.env.STRIPE_INITIATION_PRICE_ID) return 'The dedicated upgrade price is not configured.'
  if (kind === 'initial' || kind === 'initial_upgrade') {
    const others = Object.entries({
      standard: process.env.STRIPE_INITIATION_PRICE_ID, legacy_upgrade: process.env.STRIPE_INITIATION_UPGRADE_PRICE_ID,
      initial: process.env.STRIPE_INITIATION_INITIAL_PRICE_ID, initial_upgrade: process.env.STRIPE_INITIATION_INITIAL_UPGRADE_PRICE_ID,
    }).filter(([key]) => key !== kind).map(([, value]) => value)
    if (price && others.includes(price)) return 'The dedicated bundle price is not configured.'
  }
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
