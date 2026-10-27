'use server'

import { activationStatus, completeActivation, type ActivationResult } from '@/lib/activation'
import { createClient } from '@/lib/supabase/server'

export type ActivationLinkCheck =
  | { status: 'ready' | 'expired'; next: string | null }
  | { status: 'activated'; destination: '/console' | '/login?redirect=%2Fconsole' }

/** The activation link itself is the credential; these actions accept nothing else from the browser. */
export async function checkActivationLink(token: string): Promise<ActivationLinkCheck> {
  let result: Awaited<ReturnType<typeof activationStatus>>
  try { result = await activationStatus(token) } catch { return { status: 'expired', next: null } }
  if (result.status !== 'activated') return { status: result.status, next: result.next }

  // The old activation link never signs anyone in; only the current verified session can skip login.
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user && !error) return { status: 'activated', destination: '/console' }
  } catch { /* An unavailable session requires login, not a new activation email. */ }
  return { status: 'activated', destination: '/login?redirect=%2Fconsole' }
}

export async function activateAccount(token: string, displayName: string, password: string): Promise<ActivationResult> {
  try { return await completeActivation(token, displayName, password) }
  catch { return { ok: false, reason: 'failed', message: 'ERR: ACCOUNT COULD NOT BE ACTIVATED. PLEASE TRY AGAIN.' } }
}
