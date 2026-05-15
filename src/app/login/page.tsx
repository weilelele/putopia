'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/intel'

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
    } else {
      window.location.href = redirect
    }
  }

  return (
    <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="top-bar" style={{ position: 'absolute', top: 0, left: '2.5rem', right: '2.5rem' }}>
        <div className="crumbs">PC://CONSOLE <span>/</span> AUTHENTICATION</div>
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="h-eyebrow" style={{ marginBottom: '0.5rem' }}>// IDENTITY VERIFICATION</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-nucleus)', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(255,90,31,0.5)' }}>
            AUTHENTICATE
          </div>
        </div>

        <div className="hud-frame">
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@domain.void"
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#4A5570' }}>
                ACCESS CODE
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-dark"
              />
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
              style={{ justifyContent: 'center', fontSize: '0.8rem' }}
            >
              {loading ? '> AUTHENTICATING...' : '[ AUTHENTICATE ]'}
            </button>
          </form>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', border: '1px solid var(--bd-faint)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--color-star-deep)', marginBottom: '0.5rem' }}>
            NO ACTIVE CREDENTIALS?
          </div>
          <Link href="/#apply" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--color-nucleus)' }}>
            APPLY FOR VOYAGER STATUS →
          </Link>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--color-star-deep)', opacity: 0.5 }}>
          // ALL ACCESS ATTEMPTS ARE LOGGED //
        </div>
      </div>

      <div className="footer-bar" style={{ position: 'absolute', bottom: '2rem', left: '2.5rem', right: '2.5rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
