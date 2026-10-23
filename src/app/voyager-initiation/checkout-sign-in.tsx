'use client'

import { useEffect, useId, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveSheet } from '@/components/archive-sheet'
import { createClient } from '@/lib/supabase/client'
import { normalizeEmailCode, normalizeSignInEmail, SIGN_IN_MESSAGES, signInFailure } from '@/lib/checkout-sign-in'
import styles from './checkout-sign-in.module.css'

const RESEND_SECONDS = 60
type Mode = 'email' | 'code' | 'password'
type AuthResult = Promise<{ error: { code?: string; status?: number; message?: string } | null }>
export type CheckoutSignInServices = {
  sendCode: (email: string) => AuthResult
  verifyCode: (email: string, token: string) => AuthResult
  signInWithPassword: (email: string, password: string) => AuthResult
}
const supabaseSignIn: CheckoutSignInServices = {
  sendCode: email => createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } }),
  verifyCode: (email, token) => createClient().auth.verifyOtp({ email, token, type: 'email' }),
  signInWithPassword: (email, password) => createClient().auth.signInWithPassword({ email, password }),
}

/**
 * Sign-in on the Pay button. An email code is the default because it works for
 * new and existing Voyagers alike (Supabase creates the account on first use);
 * members who know their password can switch to it.
 */
export function CheckoutSignIn({ open, onClose, onSignedIn, services = supabaseSignIn }: { open: boolean; onClose: () => void; onSignedIn: () => void; services?: CheckoutSignInServices }) {
  const formId = useId()
  const [mode, setMode] = useState<Mode>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn(seconds => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  function switchTo(next: Mode) {
    setMode(next)
    setError('')
    setCode('')
    setPassword('')
  }

  async function sendCode() {
    const normalized = normalizeSignInEmail(email)
    if (!normalized) { setError('Enter a valid email address.'); return }
    setBusy(true)
    setError('')
    const { error: sendError } = await services.sendCode(normalized)
    setBusy(false)
    if (sendError) { setError(SIGN_IN_MESSAGES[signInFailure(sendError)]); return }
    setEmail(normalized)
    setResendIn(RESEND_SECONDS)
    setMode('code')
  }

  async function verifyCode() {
    const token = normalizeEmailCode(code)
    if (!token) { setError('Enter the code from your email.'); return }
    setBusy(true)
    setError('')
    const { error: verifyError } = await services.verifyCode(email, token)
    setBusy(false)
    if (verifyError) { setError(SIGN_IN_MESSAGES[signInFailure(verifyError)]); return }
    onSignedIn()
  }

  async function signInWithPassword() {
    const normalized = normalizeSignInEmail(email)
    if (!normalized || !password) { setError('Enter your email and password.'); return }
    setBusy(true)
    setError('')
    const { error: passwordError } = await services.signInWithPassword(normalized, password)
    setBusy(false)
    if (passwordError) { setError(SIGN_IN_MESSAGES[signInFailure(passwordError)]); return }
    onSignedIn()
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    void (mode === 'email' ? sendCode() : mode === 'code' ? verifyCode() : signInWithPassword())
  }

  const primaryLabel = mode === 'email' ? 'SEND CODE' : 'CONTINUE TO CHECKOUT'
  const footer = <div className="archive-sheet__actions">
    <ArchiveButton type="submit" form={formId} fullWidth loading={busy}>{primaryLabel}</ArchiveButton>
  </div>

  return <ArchiveSheet open={open} onClose={onClose} title={mode === 'password' ? 'Sign in with password' : 'Sign in to continue'} busy={busy} footer={footer}>
    <form id={formId} className={styles.form} onSubmit={submit} noValidate>
      {mode === 'email' && <>
        <p>Enter your email and we will send you a sign-in code. New and returning Voyagers both continue straight to checkout.</p>
        <ArchiveField htmlFor={`${formId}-email`} label="EMAIL" error={error || undefined}>
          <ArchiveInput type="email" autoComplete="email" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} autoFocus />
        </ArchiveField>
        <button type="button" className={styles.switch} onClick={() => switchTo('password')}>Have a password? Sign in with it</button>
      </>}
      {mode === 'code' && <>
        <p>We sent a code to <strong>{email}</strong>. Enter it below. Check spam if it has not arrived.</p>
        <ArchiveField htmlFor={`${formId}-code`} label="SIGN-IN CODE" error={error || undefined}>
          <ArchiveInput type="text" autoComplete="one-time-code" inputMode="numeric" value={code} onChange={event => setCode(event.target.value)} autoFocus />
        </ArchiveField>
        <div className={styles.links}>
          <button type="button" className={styles.switch} disabled={busy || resendIn > 0} onClick={() => void sendCode()}>{resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}</button>
          <button type="button" className={styles.switch} disabled={busy} onClick={() => switchTo('email')}>Use a different email</button>
        </div>
      </>}
      {mode === 'password' && <>
        <ArchiveField htmlFor={`${formId}-password-email`} label="EMAIL">
          <ArchiveInput type="email" autoComplete="email" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} autoFocus />
        </ArchiveField>
        <ArchiveField htmlFor={`${formId}-password`} label="PASSWORD" error={error || undefined}>
          <ArchiveInput type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
        </ArchiveField>
        <button type="button" className={styles.switch} onClick={() => switchTo('email')}>No password? Email me a code instead</button>
      </>}
    </form>
  </ArchiveSheet>
}
