// Pure rules for email checkout: a guest enters only an email. An activated account signs in with its
// password first; any other email gets an activation link and goes straight to Stripe, signed out.

/**
 * Pay-first starts a checkout for an email nobody has verified yet, so one IP is limited. Over the limit the
 * buyer gets the activation link only, and pays after setting a password, which never blocks a real purchase.
 * The limit is per IP only, so other buyers are never affected.
 */
export const EMAIL_CHECKOUT_LIMITS = {
  /** Email checkouts started from one IP within an hour. */
  perIpPerHour: 3,
} as const

export type EmailCheckoutGate = 'checkout' | 'activate_first'

export function emailCheckoutGate(input: { ip: string | null; recentFromIp: number | null }): EmailCheckoutGate {
  if (!input.ip || input.recentFromIp === null) return 'activate_first'
  return input.recentFromIp >= EMAIL_CHECKOUT_LIMITS.perIpPerHour ? 'activate_first' : 'checkout'
}

/** What the email route answers when it does not return a Stripe URL. */
export type EmailCheckoutNext = 'checkout' | 'password' | 'activation_sent' | 'already_member' | 'upgrade'

/**
 * What an existing, unactivated account may still buy with email checkout:
 * - `already_member`: a paid or granted S26 member; there is nothing to pay.
 * - `upgrade`: owns Packs 1–2 (Initial Pack or a historical Voyager Pack); only the $460 Console + Pack 4 upgrade.
 * - `none`: may buy either bundle.
 */
export function emailCheckoutOwnership(input: { entitlement: boolean; member: boolean; upgradeEligible: boolean }): 'already_member' | 'upgrade' | 'none' {
  if (input.entitlement) return 'already_member'
  if (input.upgradeEligible) return 'upgrade'
  return input.member ? 'already_member' : 'none'
}

/** Where an Initiation buyer lands once the activation link has set the password. */
export const INITIATION_ACTIVATION_NEXT = '/voyager-initiation'
