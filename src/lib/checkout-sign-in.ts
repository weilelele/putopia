// Pure rules for the email dialog on the Initiation Pay button.

/** Lower-cased email, or null when it is not a plausible address. */
export function normalizeSignInEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export type SignInFailure = 'rate_limited' | 'invalid_password' | 'failed'

/** Map a Supabase password sign-in error to what the dialog tells the buyer. */
export function signInFailure(error: { code?: string; status?: number; message?: string }): SignInFailure {
  if (error.code === 'over_request_rate_limit' || error.status === 429) return 'rate_limited'
  if (error.code === 'invalid_credentials' || error.code === 'email_not_confirmed') return 'invalid_password'
  return 'failed'
}

export const SIGN_IN_MESSAGES: Record<SignInFailure, string> = {
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  invalid_password: 'That password is incorrect.',
  failed: 'Sign-in is unavailable right now. Please try again.',
}
