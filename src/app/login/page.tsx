'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/console'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('ERR: FIELDS INCOMPLETE')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(`ERR: ${authError.message.toUpperCase()}`)
      setLoading(false)
      posthog.capture('login_failed', { error: authError.message })
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) posthog.identify(user.id, { email: user.email })
      posthog.capture('user_logged_in', { email })
      window.location.href = redirect
    }
  }

  return (
    <main className="main pilot-archive-page pilot-login-page">
      <ArchiveBrandHeader />

      <div className="pilot-login-shell">
        <header className="pilot-login-heading">
          <h1 className="pilot-login-title">
            AUTHENTICATE
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="pilot-login-form">
          <ArchiveField htmlFor="login-email" label="EMAIL ADDRESS">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </ArchiveField>

          <ArchiveField htmlFor="login-password" label="ACCESS CODE">
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </ArchiveField>

          {error && (
            <div className="pilot-control-message is-error" role="alert">
              <span aria-hidden="true">!</span>
              <span>{error}</span>
            </div>
          )}

          <ArchiveButton disabled={loading} fullWidth type="submit">
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </ArchiveButton>
        </form>

        <div className="pilot-login-access">
          <ArchiveLinkButton fullWidth href="/new">
            REQUEST ACCESS
          </ArchiveLinkButton>
        </div>
      </div>
    </main>
  )
}
