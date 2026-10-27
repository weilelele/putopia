'use server'

import { activationStatus, completeActivation, type ActivationResult } from '@/lib/activation'

/** The activation link itself is the credential; these actions accept nothing else from the browser. */
export async function checkActivationLink(token: string): Promise<{ status: 'ready' | 'expired' | 'activated'; next: string | null }> {
  try { return await activationStatus(token) } catch { return { status: 'expired', next: null } }
}

export async function activateAccount(token: string, displayName: string, password: string): Promise<ActivationResult> {
  try { return await completeActivation(token, displayName, password) }
  catch { return { ok: false, reason: 'failed', message: 'ERR: ACCOUNT COULD NOT BE ACTIVATED. PLEASE TRY AGAIN.' } }
}
