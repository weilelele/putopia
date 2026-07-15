'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'
import { HudField } from '@/components/hud-field'

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
      <div className="top-bar pilot-archive-topbar">
        <div className="crumbs">PC://CONSOLE <span>/</span> AUTHENTICATION</div>
      </div>

      <div className="pilot-login-shell">
        <header className="pilot-login-heading">
          <div className="pilot-login-heading__meta">
            <div className="h-eyebrow">{"// IDENTITY VERIFICATION"}</div>
            <span>AUTH / 01</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 900, color: 'var(--color-nucleus)', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(255,90,31,0.5)' }}>
            AUTHENTICATE
          </div>
          <div className="pilot-login-heading__rule" aria-hidden="true">
            <span />
            <span>SECURE CHANNEL</span>
          </div>
        </header>

        <div className="hud-frame pilot-login-frame">
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div className="pilot-login-frame__header">
            <span>CREDENTIAL INTAKE</span>
            <span>FORM / MC-AUTH</span>
          </div>
          <div className="pilot-login-form-inner">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="pilot-control-field">
              <label htmlFor="login-email" className="pilot-control-label">
                <span className="pilot-control-label__index">01</span>
                <span>EMAIL ADDRESS</span>
                <span className="pilot-control-label__state">REQUIRED</span>
              </label>
              <HudField className="pilot-control-input" style={{ '--field-code': '"ID"' } as React.CSSProperties}>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@domain.void"
                  className="input-dark"
                />
              </HudField>
            </div>

            <div className="pilot-control-field">
              <label htmlFor="login-password" className="pilot-control-label">
                <span className="pilot-control-label__index">02</span>
                <span>ACCESS CODE</span>
                <span className="pilot-control-label__state">ENCRYPTED</span>
              </label>
              <HudField className="pilot-control-input" style={{ '--field-code': '"KY"' } as React.CSSProperties}>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-dark"
                />
              </HudField>
            </div>

            {error && (
              <div
                className="pilot-control-message is-error"
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-orange pilot-action-button w-full disabled:cursor-not-allowed"
            >
              <span className="pilot-action-button__code" aria-hidden="true">EXEC 01</span>
              <span>{loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}</span>
              <span className="pilot-action-button__arrow" aria-hidden="true">→</span>
            </button>
          </form>
          </div>
        </div>

        <div className="pilot-login-access">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-deep)', marginBottom: '0.5rem' }}>
            NO ACTIVE CREDENTIALS?
          </div>
          <Link href="/new" className="pilot-access-button">
            <span aria-hidden="true">REQ 02</span>
            <span>REQUEST ACCESS PERMISSION</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="pilot-login-notice">{"// ALL ACCESS ATTEMPTS ARE LOGGED //"}</div>
      </div>

      <div className="footer-bar pilot-archive-footer">
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </main>
  )
}
