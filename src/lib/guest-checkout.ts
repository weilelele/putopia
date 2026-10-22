// Pure rules for anonymous (pay-first) Initiation checkout.

export const GUEST_SUPPORT_EMAIL = 'voyagers@multiverseco.org'

/** Lower-cased email, or null when it is not a plausible address. */
export function normalizeGuestEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

/**
 * The account Stripe metadata names. A claimed guest order moved to a
 * registered account keeps the anonymous buyer in `purchased_by` (schema_v109).
 */
export function initiationBuyerId(order: { user_id: string; purchased_by?: string | null }): string {
  return order.purchased_by ?? order.user_id
}

export type GuestEmailOutcome = 'sent' | 'exists' | 'rate_limited' | 'failed'

/** Map a Supabase `updateUser({ email })` error to what the buyer is told. */
export function guestEmailOutcome(error: { code?: string; status?: number } | null): GuestEmailOutcome {
  if (!error) return 'sent'
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return 'exists'
  if (error.code === 'over_email_send_rate_limit' || error.status === 429) return 'rate_limited'
  return 'failed'
}

/**
 * An anonymous buyer whose checkout email already belongs to a seat holder is
 * almost certainly an existing member who forgot to log in: release the card
 * authorization instead of charging for a second seat.
 */
export function guestSeatConflict(buyer: { id: string; anonymous: boolean }, seatHolderIds: readonly string[]): boolean {
  return buyer.anonymous && seatHolderIds.some(id => id !== buyer.id)
}

const CLAIM_MESSAGES = {
  transferred: 'Your guest purchase is now on this account.',
  released: 'This account already holds an S26 seat, so the guest purchase was canceled. Your card was not charged; any temporary hold will drop off.',
  seat_owned: `This account already holds an S26 seat, so the guest purchase was not added. Email ${GUEST_SUPPORT_EMAIL} from this account and we will refund the second payment.`,
  needs_support: `This account has earlier Initiation records, so we need to combine them by hand. Email ${GUEST_SUPPORT_EMAIL} from this account; your payment is safe.`,
  nothing: 'There was no guest purchase to add to this account.',
  expired: `The guest purchase could not be matched to this browser. Email ${GUEST_SUPPORT_EMAIL} from this account with the email you used at checkout.`,
  failed: 'Your guest purchase could not be added yet.',
} as const
export type GuestClaimNotice = keyof typeof CLAIM_MESSAGES

/** Outcome of /api/initiation-claim, from the `?claim=` it redirects with. */
export function guestClaimNotice(raw: unknown): { code: GuestClaimNotice; message: string } | null {
  return typeof raw === 'string' && Object.hasOwn(CLAIM_MESSAGES, raw)
    ? { code: raw as GuestClaimNotice, message: CLAIM_MESSAGES[raw as GuestClaimNotice] } : null
}
