'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAnonymousUser } from '@/lib/supabase/anonymous'
import { GUEST_CLAIM_COOKIE, GUEST_CLAIM_TTL_SECONDS, signGuestClaim } from '@/lib/guest-claim-token'
import { claimableGuestOrder, guestClaimKey, GUEST_CLAIM_PATH } from '@/lib/guest-claim'

/**
 * Remember this browser's anonymous purchase, then send the buyer to log in to
 * their existing account. The claim route moves the purchase after login.
 */
export async function startGuestClaim(): Promise<{ href: string } | { error: string }> {
  const client = await createClient({ allowAnonymous: true })
  const { data: { user } } = await client.auth.getUser()
  if (!user || !isAnonymousUser(user)) return { error: 'There is no guest purchase in this browser to add.' }
  try {
    if (!await claimableGuestOrder(user.id)) return { error: 'There is no guest purchase in this browser to add.' }
  } catch {
    return { error: 'Your purchase could not be checked. Please try again.' }
  }
  const cookieStore = await cookies()
  cookieStore.set(GUEST_CLAIM_COOKIE, signGuestClaim(user.id, Math.floor(Date.now() / 1000), guestClaimKey()), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: GUEST_CLAIM_PATH, maxAge: GUEST_CLAIM_TTL_SECONDS,
  })
  return { href: `/login?redirect=${encodeURIComponent(GUEST_CLAIM_PATH)}` }
}
