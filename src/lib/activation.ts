import 'server-only'
import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { activationEmail, createActivationToken, readActivationToken, type ActivationClaims, type ActivationPurpose } from '@/lib/activation-link'

/** Activation links are signed with a dedicated secret when set, else a key derived from the service-role key. */
function activationSecret(): string {
  const dedicated = process.env.ACTIVATION_LINK_SECRET
  if (dedicated) return dedicated
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Activation links are not configured')
  return createHmac('sha256', serviceKey).update('putopia:activation-link:v1').digest('hex')
}

export function readActivation(token: unknown): ActivationClaims | null {
  return readActivationToken(token, activationSecret(), Date.now())
}

export async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient()
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found
    if (!data.nextPage) return null
    page = data.nextPage
  }
}

function isExistingAccountError(error: { code?: string; status?: number; message?: string }): boolean {
  return error.code === 'email_exists' || error.code === 'user_already_exists'
    || (error.status === 422 && /already (been )?registered|already exists/i.test(error.message ?? ''))
}

export type Account = { id: string; activated: boolean }

/** Activated means /register finished: a password and display name are set. */
export async function accountState(id: string): Promise<Account> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from('voyager_profiles').select('registered_at').eq('id', id).maybeSingle()
  if (error) throw error
  return { id, activated: !!data?.registered_at }
}

/** Exact server-only Auth lookup, including accounts whose profile is missing. Never enumerate users. */
export async function findAccount(email: string): Promise<Account | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).rpc('find_activation_account', { p_email: email.trim().toLowerCase() })
  if (error) throw error
  if (!Array.isArray(data) || data.length > 1) throw new Error('Account lookup is ambiguous')
  if (!data.length) return null
  if (typeof data[0].id !== 'string' || typeof data[0].activated !== 'boolean') throw new Error('Account lookup is unavailable')
  return { id: data[0].id, activated: data[0].activated }
}

/** An existing account, or a new unactivated one. No Supabase email is sent. */
export async function findOrCreateAccount(email: string, signupSource: string): Promise<Account & { created: boolean }> {
  const existing = await findAccount(email)
  if (existing) return { ...existing, created: false }
  return createUnactivatedAccount(email, signupSource)
}

/** Call after a lookup found no account; a concurrent signup is still recovered below. */
export async function createUnactivatedAccount(email: string, signupSource: string): Promise<Account & { created: boolean }> {
  const { data, error } = await createAdminClient().auth.admin.createUser({ email, email_confirm: false, app_metadata: { signup_source: signupSource } })
  if (error) {
    // Lost a race with another request for the same email.
    if (isExistingAccountError(error)) {
      const raced = await findAccount(email)
      if (raced) return { ...raced, created: false }
    }
    throw error
  }
  return { id: data.user.id, activated: false, created: true }
}

/** A fresh 24-hour activation link. `next` is where the account lands once the password is set. */
export function activationLink(userId: string, next?: string | null): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiverseco.org'
  const link = new URL('/register', siteUrl)
  link.searchParams.set('key', createActivationToken({ userId, next, now: Date.now() }, activationSecret()))
  return link.href
}

export async function sendActivationEmail(input: { userId: string; email: string; purpose: ActivationPurpose; next?: string | null; timeoutMs?: number }): Promise<{ error: string | null }> {
  return sendEmail({ to: input.email, timeoutMs: input.timeoutMs, ...activationEmail(activationLink(input.userId, input.next), input.purpose) })
}

export type ActivationResult = { ok: true; email: string; next: string | null } | { ok: false; reason: 'expired' | 'activated' | 'invalid' | 'failed'; message: string }

/**
 * Sets the password and display name for the account named by an activation link.
 * The link stays usable until this succeeds; afterwards the account signs in with its password.
 */
export async function completeActivation(token: unknown, displayName: string, password: string): Promise<ActivationResult> {
  const claims = readActivation(token)
  if (!claims) return { ok: false, reason: 'expired', message: 'This activation link has expired. Request a new one.' }
  const name = displayName.trim()
  if (!name || name.length > 40) return { ok: false, reason: 'invalid', message: 'ERR: DISPLAY NAME REQUIRED' }
  if (password.length < 8) return { ok: false, reason: 'invalid', message: 'ERR: ACCESS CODE MUST BE AT LEAST 8 CHARACTERS' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(claims.userId)
  if (userError || !user?.email) return { ok: false, reason: 'expired', message: 'This activation link is no longer valid. Request a new one.' }
  if ((await accountState(user.id)).activated) return { ok: false, reason: 'activated', message: 'This account is already activated. Log in with your password.' }
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password, email_confirm: true, user_metadata: { ...user.user_metadata, display_name: name },
  })
  if (updateError) return { ok: false, reason: 'failed', message: `ERR: ${String(updateError.message).toUpperCase()}` }
  const { error: profileError } = await admin.from('voyager_profiles')
    .update({ display_name: name, email: user.email.toLowerCase(), registered_at: new Date().toISOString() })
    .eq('id', user.id).is('registered_at', null)
  if (profileError) return { ok: false, reason: 'failed', message: 'ERR: ACCOUNT COULD NOT BE ACTIVATED. PLEASE TRY AGAIN.' }
  return { ok: true, email: user.email, next: claims.next }
}

/** Whether an activation link can still set a password, for the page to show the right state up front. */
export async function activationStatus(token: unknown): Promise<{ status: 'ready' | 'expired' | 'activated'; next: string | null }> {
  const claims = readActivation(token)
  if (!claims) return { status: 'expired', next: null }
  return { status: (await accountState(claims.userId)).activated ? 'activated' : 'ready', next: claims.next }
}
