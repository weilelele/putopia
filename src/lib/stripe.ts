import Stripe from 'stripe'

// The $12 pack, in cents. Shipping is included (US-only).
export const PACK_PRICE_CENTS = 1200

let _stripe: Stripe | null = null

export function isStripeSecretKey(value: string | undefined): value is string {
  if (!value) return false
  return /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+$/.test(value)
}

export type StripeMode = 'test' | 'live'

export function getStripeMode(secretKey: string | undefined): StripeMode | null {
  if (!isStripeSecretKey(secretKey)) return null
  return secretKey.includes('_test_') ? 'test' : 'live'
}

/** Session IDs are mode-scoped by Stripe and cannot be retrieved with the other mode's key. */
export function getStripeSessionMode(sessionId: string | null | undefined): StripeMode | null {
  if (!sessionId) return null
  if (sessionId.startsWith('cs_test_')) return 'test'
  if (sessionId.startsWith('cs_live_')) return 'live'
  return null
}

export function stripeSessionModeMismatch(
  sessionId: string | null | undefined,
  secretKey: string | undefined,
): boolean {
  const sessionMode = getStripeSessionMode(sessionId)
  const keyMode = getStripeMode(secretKey)
  return sessionMode !== null && keyMode !== null && sessionMode !== keyMode
}

/** Returns a Stripe client, or null when keys are not configured yet (mock mode). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!isStripeSecretKey(key)) return null
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}

/** True once both the secret key and the price id are present. */
export function isStripeConfigured(): boolean {
  return (
    isStripeSecretKey(process.env.STRIPE_SECRET_KEY)
    && !!process.env.STRIPE_PRICE_ID
  )
}
