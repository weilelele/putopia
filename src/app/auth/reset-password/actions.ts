'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { RECOVERY_LINK_COOKIE, clearRecoveryContext, createRecoveryClient, hasRecoveryContext, recoveryCookieOptions } from '@/lib/supabase/password-recovery'

export type ResetPasswordState = { error: string; invalidLink?: true } | null

const INVALID_LINK = { error: 'This reset link has expired or has already been used.', invalidLink: true } as const
const RETRY = { error: 'Could not reset your password. Try again.' }

export async function resetPassword(_previous: ResetPasswordState, data: FormData): Promise<ResetPasswordState> {
  const password = data.get('password')
  if (typeof password !== 'string' || password.length < 8) return { error: 'Use at least 8 characters.' }
  if (password !== data.get('confirmPassword')) return { error: 'The passwords do not match.' }

  const store = await cookies()
  if (!hasRecoveryContext(store)) return INVALID_LINK
  const supabase = createRecoveryClient(store)
  const tokenHash = store.get(RECOVERY_LINK_COOKIE)?.value
  if (tokenHash) {
    const { data: verified, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    if (error?.code === 'otp_expired' || error?.code === 'validation_failed') {
      clearRecoveryContext(store)
      return INVALID_LINK
    }
    if (error || !verified.session) return RETRY
    store.set(RECOVERY_LINK_COOKIE, '', { ...recoveryCookieOptions, maxAge: 0 })
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error?.name === 'AuthSessionMissingError' || error?.code === 'session_not_found' || error?.code === 'session_expired') {
    clearRecoveryContext(store)
    return INVALID_LINK
  }
  if (error?.code === 'same_password') return { error: 'Choose a password different from your current one.' }
  if (error?.code === 'weak_password') return { error: 'Choose a stronger password. Try a longer, unique passphrase.' }
  if (error) return RETRY

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } finally {
    clearRecoveryContext(store)
  }
  redirect('/login?password=reset')
}
