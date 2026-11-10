'use client'

import { createClient } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveLinkButton } from '@/components/archive-link-button'

let requestClient: ReturnType<typeof createClient> | undefined

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      // The email contains a one-time token hash. Requesting it must not leave
      // a PKCE verifier in this browser or alter the regular login session.
      const supabase = requestClient ??= createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { storageKey: 'mc-password-reset-request', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
      )
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error?.code === 'over_request_rate_limit') {
        setError('Too many requests. Wait a minute and try again.')
      } else if (error?.name === 'AuthRetryableFetchError' || error?.name === 'AuthUnknownError') {
        setError('Could not reach the password reset service. Try again.')
      } else {
        // Email-specific failures, including cooldowns, must not reveal
        // whether the address has an account.
        setSent(true)
      }
    } catch {
      setError('Could not request a reset link. Try again.')
    } finally {
      setPending(false)
    }
  }

  if (sent) return (
    <div className="pilot-login-form">
      <p className="archive-form-message" role="status">
        If an account exists for that email address, you’ll receive a password reset link.
        Check your inbox and spam folder.
      </p>
      <ArchiveButton variant="secondary" fullWidth onClick={() => { setEmail(''); setSent(false) }}>
        TRY ANOTHER EMAIL
      </ArchiveButton>
      <ArchiveLinkButton href="/login" fullWidth>BACK TO LOG IN</ArchiveLinkButton>
    </div>
  )

  return (
    <form className="pilot-login-form" onSubmit={requestReset}>
      <ArchiveField htmlFor="recovery-email" label="EMAIL ADDRESS">
        <ArchiveInput id="recovery-email" type="email" autoComplete="email" required maxLength={254}
          value={email} onChange={(event) => setEmail(event.target.value)} />
      </ArchiveField>
      {error && <p className="archive-form-message is-error" role="alert">{error}</p>}
      <ArchiveButton type="submit" fullWidth disabled={pending} aria-busy={pending}>
        {pending ? 'SENDING…' : 'SEND RESET LINK'}
      </ArchiveButton>
    </form>
  )
}
