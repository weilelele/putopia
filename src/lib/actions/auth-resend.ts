'use server'

import { createAdminClient } from '@/lib/supabase/server'

export interface ResendResult {
  ok: boolean
  error?: string
}

/**
 * Resend an access link to a user whose invite/magic link has expired.
 * Checks that the email belongs to an existing invited account before sending.
 */
export async function resendAccessLink(email: string): Promise<ResendResult> {
  const admin = createAdminClient()
  const normalised = email.trim().toLowerCase()

  // Verify an account exists for this email (uses the email column we added in schema_v25).
  // `email` exists in the DB but isn't in the generated TS types — cast to bypass.
  const { data: profile } = await (admin.from('voyager_profiles' as never) as ReturnType<typeof admin.from>)
    .select('id, registered_at')
    .eq('email', normalised)
    .maybeSingle()

  if (!profile) {
    return { ok: false, error: 'NO ACCOUNT FOUND FOR THIS EMAIL.' }
  }

  // Generate a magic link — Supabase sends the email automatically.
  // If the user has already registered, send them to the console; otherwise to /register.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
  const next = (profile as { registered_at?: string | null }).registered_at ? '/intel' : '/register'
  const { error } = await (admin.auth.admin as any).generateLink({
    type: 'magiclink',
    email: normalised,
    options: {
      redirect_to: `${siteUrl}/auth/callback?next=${next}`,
    },
  })

  if (error) return { ok: false, error: error.message.toUpperCase() }
  return { ok: true }
}
