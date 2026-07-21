'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { resendAccessLink } from '@/lib/actions/auth-resend'

function ExpiredInner() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrMsg('')
    const res = await resendAccessLink(email)
    if (res.ok) {
      setStatus('sent')
    } else {
      setStatus('error')
      setErrMsg(res.error ?? 'SOMETHING WENT WRONG.')
    }
  }

  return (
    <main className="main pilot-archive-page archive-auth-page">
      <ArchiveBrandHeader />
      <div className="archive-auth-shell">
        <header className="archive-auth-heading">
          <p>LINK EXPIRED</p>
          <h1>ACCESS <span>EXPIRED</span></h1>
          <div>Your access link is no longer valid. Enter your email to receive a new one.</div>
        </header>

        {status === 'sent' ? (
          <ArchiveCard className="archive-auth-confirmation">
            <h2>LINK SENT</h2>
            <p>Check your inbox at <span>{email}</span>.</p>
          </ArchiveCard>
        ) : (
          <form onSubmit={handleResend} className="archive-auth-form">
            <ArchiveField htmlFor="expired-email" label="EMAIL ADDRESS">
              <input
                id="expired-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </ArchiveField>

            {status === 'error' && <div className="archive-form-message is-error" role="alert">{errMsg}</div>}

            <ArchiveButton disabled={status === 'loading'} fullWidth type="submit">
              {status === 'loading' ? 'SENDING...' : 'RESEND ACCESS LINK'}
            </ArchiveButton>
          </form>
        )}

        <ArchiveLinkButton fullWidth href="/login" variant="secondary">LOG IN</ArchiveLinkButton>
      </div>
    </main>
  )
}

export default function AuthExpiredPage() {
  return (
    <Suspense>
      <ExpiredInner />
    </Suspense>
  )
}
