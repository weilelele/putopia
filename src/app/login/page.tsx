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
    <div className="main pilot-archive-page pilot-login-page">
      <div className="top-bar pilot-archive-topbar">
        <div className="crumbs">PC://CONSOLE <span>/</span> AUTHENTICATION</div>
      </div>

      <div className="pilot-login-shell">
        <header className="pilot-login-heading">
          <div className="h-eyebrow" style={{ marginBottom: '0.5rem' }}>{"// IDENTITY VERIFICATION"}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 900, color: 'var(--color-nucleus)', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(255,90,31,0.5)' }}>
            AUTHENTICATE
          </div>
        </header>

        <div className="hud-frame pilot-login-frame">
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div className="pilot-login-form-inner">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: 'rgba(245,245,245,0.35)' }}>
                EMAIL ADDRESS
              </label>
              <HudField>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@domain.void"
                  className="input-dark"
                />
              </HudField>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: 'rgba(245,245,245,0.35)' }}>
                ACCESS CODE
              </label>
              <HudField>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-dark"
                />
              </HudField>
            </div>

            {error && (
              <div
                className="text-xs font-mono py-2 px-3 border"
                style={{ color: '#E83030', borderColor: 'rgba(232,48,48,0.3)', background: 'rgba(232,48,48,0.08)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-orange w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ justifyContent: 'center', fontSize: 'var(--fs-label)' }}
            >
              {loading ? '> AUTHENTICATING...' : '[ AUTHENTICATE ]'}
            </button>
          </form>
          </div>
        </div>

        <div className="pilot-login-access">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-deep)', marginBottom: '0.5rem' }}>
            NO ACTIVE CREDENTIALS?
          </div>
          <Link href="/new" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', color: 'var(--color-nucleus)' }}>
            REQUEST ACCESS PERMISSION. →
          </Link>
        </div>

        <div className="pilot-login-notice">{"// ALL ACCESS ATTEMPTS ARE LOGGED //"}</div>
      </div>

      <div className="footer-bar pilot-archive-footer">
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
