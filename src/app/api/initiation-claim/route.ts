import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { GUEST_CLAIM_COOKIE, verifyGuestClaim } from '@/lib/guest-claim-token'
import { claimableGuestOrder, guestClaimKey, guestPurchaseReleasedForSeat, GUEST_CLAIM_PATH, type GuestClaimResult } from '@/lib/guest-claim'
import { releaseUncapturedGuestOrder } from '@/lib/initiation-reconciliation'

export const dynamic = 'force-dynamic'

/**
 * Login lands here after startGuestClaim. Proof of both sides: the signed claim
 * cookie (this browser held the anonymous session that paid) and the current
 * login (this person owns the registered account). Moves the purchase once.
 */
export async function GET(request: NextRequest) {
  const done = (claim: GuestClaimResult | 'released' | 'expired' | 'failed', keepCookie = false) => {
    const response = NextResponse.redirect(new URL(`/voyager-initiation?claim=${claim}`, request.url))
    if (!keepCookie) response.cookies.set(GUEST_CLAIM_COOKIE, '', { path: GUEST_CLAIM_PATH, maxAge: 0 })
    return response
  }
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(GUEST_CLAIM_PATH)}`, request.url))
  const anonymousUserId = verifyGuestClaim(request.cookies.get(GUEST_CLAIM_COOKIE)?.value, Math.floor(Date.now() / 1000), guestClaimKey())
  if (!anonymousUserId) return done('expired')
  try {
    const order = await claimableGuestOrder(anonymousUserId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createAdminClient() as any).rpc('transfer_guest_initiation', { p_from: anonymousUserId, p_to: user.id })
    if (error) throw error
    const result = data as GuestClaimResult
    if (result === 'seat_owned' && order) {
      const stripe = getStripe()
      if (stripe && await releaseUncapturedGuestOrder(order.id, stripe)) return done('released')
    }
    if (result === 'nothing' && await guestPurchaseReleasedForSeat(anonymousUserId, user.id)) return done('released')
    return done(result)
  } catch (error) {
    console.error('[initiation-claim] Guest purchase could not be claimed:', error instanceof Error ? error.message : 'unknown')
    return done('failed', true)
  }
}
