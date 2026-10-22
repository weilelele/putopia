import { createHmac, timingSafeEqual } from 'node:crypto'

// A claim token proves this browser held an anonymous checkout session. Logging
// in replaces that session, so the signed cookie is the only remaining proof.
export const GUEST_CLAIM_COOKIE = 'mc-guest-claim'
export const GUEST_CLAIM_TTL_SECONDS = 24 * 60 * 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function signature(payload: string, key: string) {
  return createHmac('sha256', key).update(`guest-claim-v1:${payload}`).digest('base64url')
}

export function signGuestClaim(anonymousUserId: string, nowSeconds: number, key: string): string {
  const payload = `${anonymousUserId}.${nowSeconds + GUEST_CLAIM_TTL_SECONDS}`
  return `${payload}.${signature(payload, key)}`
}

/** The anonymous user id, or null for a forged, malformed or expired token. */
export function verifyGuestClaim(token: string | undefined, nowSeconds: number, key: string): string | null {
  const [userId, expires, mac, ...rest] = token?.split('.') ?? []
  if (!userId || !expires || !mac || rest.length || !UUID.test(userId) || !/^\d+$/.test(expires)) return null
  const expected = Buffer.from(signature(`${userId}.${expires}`, key))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return Number(expires) > nowSeconds ? userId : null
}
