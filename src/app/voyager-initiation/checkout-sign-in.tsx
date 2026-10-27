'use client'

import { useId, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveSheet } from '@/components/archive-sheet'
import { createClient } from '@/lib/supabase/client'
import { normalizeSignInEmail, SIGN_IN_MESSAGES, signInFailure } from '@/lib/checkout-sign-in'
import { initiationPriceLabel } from '@/lib/initiation-pricing'
import styles from './checkout-sign-in.module.css'

type Mode = 'email' | 'password' | 'activation_sent' | 'already_member' | 'upgrade'
type AuthResult = Promise<{ error: { code?: string; status?: number; message?: string } | null }>
export type CheckoutSignInServices = {
  signInWithPassword: (email: string, password: string) => AuthResult
}
const supabaseSignIn: CheckoutSignInServices = {
  signInWithPassword: (email, password) => createClient().auth.signInWithPassword({ email, password }),
}

/**
 * What the page did with an email at checkout: left for Stripe, needs the account's password first,
 * sent an activation link without starting payment (over the per-IP limit), found an unactivated member
 * with nothing to pay, found an owner of Packs 1–2 who can only add the upgrade, or failed.
 */
export type EmailCheckoutStep = { kind: 'redirected' } | { kind: 'password' } | { kind: 'activation_sent' } | { kind: 'already_member' } | { kind: 'upgrade' } | { kind: 'error'; message: string }

/**
 * Email dialog for the Initiation Pay button. An activated account enters its password and continues
 * to checkout signed in (`onSignedIn`); any other email gets an activation link and leaves for Stripe (`onEmail`).
 */
export function CheckoutSignIn({ open, onClose, onSignedIn, onEmail, capture, services = supabaseSignIn }: {
  open: boolean; onClose: () => void; onSignedIn: () => void; onEmail: (email: string, options?: { upgrade?: boolean }) => Promise<EmailCheckoutStep>
  capture?: (event: string, properties?: Record<string, unknown>) => void; services?: CheckoutSignInServices
}) {
  const formId = useId()
  const [mode, setMode] = useState<Mode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const track = (event: string, properties: Record<string, unknown> = {}) => capture?.(event, properties)

  function changeEmail() {
    setMode('email')
    setError('')
    setPassword('')
  }

  async function submitEmail(upgrade = false) {
    const normalized = normalizeSignInEmail(email)
    if (!normalized) { setError('Enter a valid email address.'); return }
    setBusy(true)
    setError('')
    const step = await onEmail(normalized, upgrade ? { upgrade: true } : undefined)
    track('initiation_checkout_email_submitted', { result: step.kind, upgrade })
    // Leaving for Stripe: stay busy so the dialog cannot be resubmitted while the page unloads.
    if (step.kind === 'redirected') return
    setBusy(false)
    if (step.kind === 'error') { setError(step.message); return }
    setEmail(normalized)
    setMode(step.kind)
  }

  async function signInWithPassword() {
    if (!password) { setError('Enter your password.'); return }
    setBusy(true)
    setError('')
    const { error: passwordError } = await services.signInWithPassword(email, password)
    setBusy(false)
    if (passwordError) {
      const reason = signInFailure(passwordError)
      track('initiation_sign_in_failed', { method: 'password', reason })
      setError(SIGN_IN_MESSAGES[reason])
      return
    }
    track('initiation_sign_in_completed', { method: 'password' })
    onSignedIn()
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (mode === 'activation_sent' || mode === 'already_member') { onClose(); return }
    void (mode === 'email' ? submitEmail() : mode === 'upgrade' ? submitEmail(true) : signInWithPassword())
  }

  function close() {
    track('initiation_sign_in_closed', { mode })
    onClose()
  }

  const upgradePrice = initiationPriceLabel('legacy_upgrade')
  const primaryLabel = mode === 'email' ? 'CONTINUE TO PAYMENT' : mode === 'password' ? 'SIGN IN AND PAY' : mode === 'upgrade' ? `CONTINUE · ${upgradePrice}` : 'DONE'
  const title = { email: 'Where should we send your membership?', password: 'Welcome back, Voyager', activation_sent: 'Check your email',
    already_member: 'You are already a Voyager', upgrade: 'You already own Packs 1–2' }[mode]
  const footer = <div className="archive-sheet__actions">
    <ArchiveButton type="submit" form={formId} fullWidth loading={busy}>{primaryLabel}</ArchiveButton>
  </div>

  return <ArchiveSheet open={open} onClose={close} title={title} busy={busy} footer={footer}>
    <form id={formId} className={styles.form} onSubmit={submit} noValidate>
      {mode === 'email' && <>
        <p>Your membership, receipt and delivery updates go to this email. We send it an activation link, and you continue straight to secure payment.</p>
        <ArchiveField htmlFor={`${formId}-email`} label="EMAIL" error={error || undefined}>
          <ArchiveInput type="email" autoComplete="email" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} autoFocus />
        </ArchiveField>
      </>}
      {mode === 'password' && <>
        <p><strong>{email}</strong> already has an activated account. Enter its password to continue to payment.</p>
        <ArchiveField htmlFor={`${formId}-password`} label="PASSWORD" error={error || undefined}>
          <ArchiveInput type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} autoFocus />
        </ArchiveField>
        <button type="button" className={styles.switch} disabled={busy} onClick={changeEmail}>Use a different email</button>
      </>}
      {mode === 'activation_sent' && <>
        <p>We sent an activation link to <strong>{email}</strong>. Open it to set your password, then return here to pay.</p>
        <button type="button" className={styles.switch} onClick={changeEmail}>Use a different email</button>
      </>}
      {mode === 'already_member' && <>
        <p><strong>{email}</strong> already has an S26 membership, so there is nothing to pay. We sent it an activation link: set your password to view your membership and deliveries.</p>
        <button type="button" className={styles.switch} onClick={changeEmail}>Use a different email</button>
      </>}
      {mode === 'upgrade' && <>
        <p><strong>{email}</strong> already owns Packs 1–2, so you pay only {upgradePrice} to add Console + Pack 4. We also sent it an activation link to view your records.</p>
        {error && <div className="archive-form-message is-error" role="alert">{error}</div>}
        <button type="button" className={styles.switch} disabled={busy} onClick={changeEmail}>Use a different email</button>
      </>}
    </form>
  </ArchiveSheet>
}
