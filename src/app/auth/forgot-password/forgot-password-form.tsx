'use client'

import { createClient } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { getEmailProvider } from '@/lib/email-providers'

let requestClient: ReturnType<typeof createClient> | undefined

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const requestedEmail = email.trim()
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
      const { error } = await supabase.auth.resetPasswordForEmail(requestedEmail)
      if (error?.code === 'over_request_rate_limit') {
        setError('Too many requests. Wait a minute and try again.')
      } else if (error?.name === 'AuthRetryableFetchError' || error?.name === 'AuthUnknownError') {
        setError('Could not reach the password reset service. Try again.')
      } else {
        // Email-specific failures, including cooldowns, must not reveal
        // whether the address has an account.
        setSentTo(requestedEmail)
      }
    } catch {
      setError('Could not request a reset link. Try again.')
    } finally {
      setPending(false)
    }
  }

  if (sentTo) {
    const provider = getEmailProvider(sentTo)
    return (
      <>
        <header className="pilot-login-heading">
          <h1 className="pilot-login-title">CHECK YOUR INBOX</h1>
          <p className="pilot-recovery-description">
            Open the email titled “Reset your Multiverse Collective password” and select Reset Password to choose a new one.
          </p>
        </header>
        <div className="pilot-login-form">
          <p className="archive-form-message" role="status" style={{ overflowWrap: 'anywhere' }}>
            If this address is linked to an account, we’ve sent a password reset email to:<br />
            <strong>{sentTo}</strong>
          </p>
          {provider ? (
            <ArchiveLinkButton href={provider.url} variant="primary" fullWidth target="_blank" rel="noopener noreferrer">
              Open {provider.name} <span aria-hidden>↗</span>
            </ArchiveLinkButton>
          ) : (
            <p>Open your usual email app or webmail to find the message.</p>
          )}
          <p>Can’t find it? Check your spam or junk folder.</p>
          <ArchiveButton variant="secondary" fullWidth onClick={() => { setEmail(''); setSentTo(null) }}>
            CHANGE EMAIL
          </ArchiveButton>
          <ArchiveLinkButton href="/login" variant="ghost" fullWidth>BACK TO LOG IN</ArchiveLinkButton>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="pilot-login-heading">
        <h1 className="pilot-login-title">FORGOT PASSWORD?</h1>
        <p className="pilot-recovery-description">Enter the email address you use to log in.</p>
      </header>
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
    </>
  )
}
