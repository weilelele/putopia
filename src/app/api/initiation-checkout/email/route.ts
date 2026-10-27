import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { initiationConfigurationError } from '@/lib/initiation-config'
import { createInitiationCheckout } from '@/lib/initiation-checkout-session'
import { normalizeSignInEmail } from '@/lib/checkout-sign-in'
import { emailCheckoutGate, emailCheckoutOwnership, INITIATION_ACTIVATION_NEXT } from '@/lib/initiation-email-checkout'
import { findAccount, createUnactivatedAccount, sendActivationEmail } from '@/lib/activation'
import { afterCheckout } from '@/lib/checkout-after'
import { requestClientIp } from '@/lib/initiation-meta-attribution'

export const dynamic = 'force-dynamic'

/**
 * Guest checkout with an email only.
 * - An activated account (password set) answers `{ next: 'password' }`: the dialog signs in, then checks out signed in.
 * - Any other email gets an activation link and goes straight to Stripe with that email; the browser stays signed out.
 * - Over the per-IP limit it gets the activation link only (`{ next: 'activation_sent' }`) and pays after setting a password.
 * An unactivated account that already bought gets the activation link too, and either `{ next: 'already_member' }`
 * (nothing to pay) or `{ next: 'upgrade' }` (only the $460 upgrade, which the buyer confirms with `upgrade: true`).
 */
export async function POST(request: Request) {
  const configError = initiationConfigurationError()
  if (configError) return NextResponse.json({ error: configError }, { status: 503 })
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin
  if (request.headers.get('origin') !== origin) return NextResponse.json({ error: 'Invalid checkout origin.' }, { status: 403 })
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (user) return NextResponse.json({ next: 'checkout' })
  const body = await request.json().catch(() => null)
  const email = normalizeSignInEmail(body?.email)
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (body?.bundle !== undefined && !['initial', 'standard'].includes(body.bundle)) return NextResponse.json({ error: 'Choose a valid bundle.' }, { status: 400 })
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const existing = await findAccount(email)
    if (existing?.activated) return NextResponse.json({ next: 'password' })
    const ownership = existing ? await accountOwnership(admin, existing.id) : 'none'
    const activate = () => sendActivationEmail({ userId: existing!.id, email, purpose: 'initiation', next: INITIATION_ACTIVATION_NEXT })
    if (ownership === 'already_member') {
      const sent = await activate()
      if (sent.error) throw new Error(`Activation email failed: ${sent.error}`)
      return NextResponse.json({ next: 'already_member' })
    }
    // Check seats before creating an account, so a closed or full batch leaves no account behind.
    // An owner of Packs 1–2 already holds a seat, so a full batch never blocks the upgrade.
    const { data: supply, error: supplyError } = await admin.rpc('initiation_availability')
    if (supplyError || !supply) throw supplyError ?? new Error('Initiation inventory is unavailable')
    if (!supply.open) return NextResponse.json({ error: 'Initiation checkout is not open yet.' }, { status: 409 })
    if (supply.remaining <= 0 && ownership !== 'upgrade') return NextResponse.json({ error: 'All S26 seats are currently allocated or reserved.' }, { status: 409 })
    const confirmedUpgrade = ownership === 'upgrade' && body?.upgrade === true
    if (ownership === 'upgrade' && !confirmedUpgrade) {
      const sent = await activate()
      if (sent.error) throw new Error(`Activation email failed: ${sent.error}`)
      return NextResponse.json({ next: 'upgrade' })
    }
    const ip = requestClientIp(request.headers)
    const emailOrders = () => admin.from('initiation_orders').select('id', { count: 'exact', head: true }).eq('analytics_context->>checkout_path', 'email_first')
    const fromIp = ip ? await emailOrders().eq('meta_attribution->>client_ip_address', ip).gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) : { count: null, error: null }
    if (fromIp.error) throw fromIp.error
    const gate = emailCheckoutGate({ ip, recentFromIp: fromIp.count })
    const account = existing ? { ...existing, created: false } : await createUnactivatedAccount(email, 'initiation_email_checkout')
    const sendActivation = () => sendActivationEmail({ userId: account.id, email, purpose: 'initiation', next: INITIATION_ACTIVATION_NEXT, timeoutMs: 5000 })
    if (gate === 'activate_first') {
      const sent = confirmedUpgrade ? { error: null } : await sendActivation()
      if (sent.error) throw new Error(`Activation email failed: ${sent.error}`)
      return NextResponse.json({ next: 'activation_sent' })
    }
    // Payment does not depend on mail delivery. A confirmed upgrade already got its activation link.
    // /auth/expired can send a fresh link if this background attempt fails.
    if (!confirmedUpgrade) afterCheckout(async () => {
      const sent = await sendActivation()
      if (sent.error) throw new Error('Activation delivery unconfirmed')
    }, '[initiation-checkout] Activation email deferred; a fresh link can be requested')
    // The server prices an upgrade from ownership; `standard` is the bundle an upgrade continues.
    return createInitiationCheckout(request, origin, { id: account.id, email }, confirmedUpgrade ? { ...body, bundle: 'standard' } : body, 'email_first')
  } catch (error) {
    console.error('[initiation-checkout] Email checkout could not start:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Checkout is unavailable right now. Please try again.' }, { status: 503 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function accountOwnership(admin: any, userId: string) {
  const [entitlement, member, initial, legacy] = await Promise.all([
    admin.from('initiation_entitlements').select('user_id').eq('user_id', userId).limit(1),
    admin.from('initiation_members').select('user_id').eq('user_id', userId).limit(1),
    admin.rpc('eligible_initial_initiation_order', { p_user: userId }),
    admin.rpc('eligible_legacy_initiation_order', { p_user: userId }),
  ])
  const failed = [entitlement, member, initial, legacy].find(result => result.error)
  if (failed) throw failed.error
  return emailCheckoutOwnership({ entitlement: entitlement.data.length > 0, member: member.data.length > 0, upgradeEligible: !!initial.data || !!legacy.data })
}
