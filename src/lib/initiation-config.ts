import 'server-only'
import type { InitiationOrderKind } from '@/lib/initiation-types'
import { initiationPolicyError } from '@/lib/initiation-checkout-policy'
import { isStripeSecretKey } from '@/lib/stripe'

export function initiationConfigurationError(kind: InitiationOrderKind = 'standard'): string | null {
  if (process.env.INITIATION_CHECKOUT_ENABLED !== 'true') return 'Initiation checkout is not open yet.'
  if (!isStripeSecretKey(process.env.STRIPE_SECRET_KEY) || !process.env.STRIPE_WEBHOOK_SECRET) return 'Payment configuration is incomplete.'
  const price = kind === 'legacy_upgrade' ? process.env.STRIPE_INITIATION_UPGRADE_PRICE_ID : process.env.STRIPE_INITIATION_PRICE_ID
  const product = process.env.STRIPE_INITIATION_PRODUCT_ID
  if (kind === 'legacy_upgrade' && price === process.env.STRIPE_INITIATION_PRICE_ID) return 'The dedicated upgrade price is not configured.'
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
