import Stripe from 'stripe'

// The $12 pack, in cents. Shipping is included (US-only).
export const PACK_PRICE_CENTS = 1200

let _stripe: Stripe | null = null

/** Returns a Stripe client, or null when keys are not configured yet (mock mode). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}

/** True once both the secret key and the price id are present. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID
}
