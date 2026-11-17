import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { normalizeSignInEmail } from './checkout-sign-in'
import { shopifyPilotOffer, type ShopifyPilotOffer } from './shopify-bundle-pilot'
import { readShopifyPilotPayment } from './shopify-pilot-payment'

export const guestPilotPath = '/shopify-guest-test'
export const guestPilotCookie = 'putopia-shopify-guest'
export const guestPilotLifetime = 24 * 60 * 60

type GuestCheckout = {
  kind: ShopifyPilotOffer['kind']
  email: string
  createdAt: string
  reference: string
  checkoutUrl: string
}

export function guestPilotOffer(kind: unknown) {
  if (!process.env.SHOPIFY_GUEST_PILOT_EMAILS || (kind !== 'initial' && kind !== 'standard')) return null
  const offer = shopifyPilotOffer(kind)
  return offer?.storefrontToken ? { ...offer, draftUrl: undefined } : null
}

export function guestPilotEmail(input: unknown) {
  const email = normalizeSignInEmail(input)
  return email && /^[a-z0-9.-]+@example\.com$/.test(email)
    && process.env.SHOPIFY_GUEST_PILOT_EMAILS?.split(',').some(value => value.trim().toLowerCase() === email)
    ? email : null
}

export function guestPilotOrigin(host: string | null) {
  return host && /^(?:127\.0\.0\.1|localhost):\d{1,5}$/.test(host) ? `http://${host}` : null
}

export function newGuestCheckout(offer: ShopifyPilotOffer, email: string) {
  return { kind: offer.kind, email, reference: randomBytes(32).toString('hex'), createdAt: new Date().toISOString() }
}

function signature(payload: string) {
  return createHmac('sha256', process.env.SHOPIFY_PILOT_CLIENT_SECRET!)
    .update('putopia:shopify-guest:v1:').update(payload).digest('base64url')
}

export function guestCheckoutCookieValue(state: GuestCheckout) {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url')
  return `${payload}.${signature(payload)}`
}

export function readGuestCheckout(token: string | undefined): GuestCheckout | null {
  if (!token || !process.env.SHOPIFY_PILOT_CLIENT_SECRET || token.length > 3500) return null
  const [payload, signed, ...rest] = token.split('.')
  if (!payload || !signed || rest.length) return null
  const expected = Buffer.from(signature(payload))
  const actual = Buffer.from(signed)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const state: GuestCheckout = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const age = Date.now() - Date.parse(state.createdAt)
    return age >= 0 && age < guestPilotLifetime * 1000
      && guestPilotOffer(state.kind) && guestPilotEmail(state.email) ? state : null
  } catch {
    return null
  }
}

export async function readGuestPayment(token: string | undefined) {
  const checkout = readGuestCheckout(token)
  const offer = checkout && guestPilotOffer(checkout.kind)
  if (!checkout || !offer) return null
  const payment = await readShopifyPilotPayment(offer, { ...checkout, requireEmail: true })
  return payment && payment.refundedPacks.length === 0 ? { checkout, offer, payment } : null
}
