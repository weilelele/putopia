'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'
import { getFirstTouch } from '@/lib/utm'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  // Guard: must have an active session (from invite link via /auth/callback)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) {
      setError('ERR: DISPLAY NAME REQUIRED')
      return
    }
    if (password.length < 8) {
      setError('ERR: ACCESS CODE MUST BE AT LEAST 8 CHARACTERS')
      return
    }
    if (password !== confirmPassword) {
      setError('ERR: ACCESS CODES DO NOT MATCH')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Set password on the invite-created account
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { display_name: displayName.trim() },
    })

    if (updateError) {
      setError(`ERR: ${updateError.message.toUpperCase()}`)
      setLoading(false)
      return
    }

    // Create voyager profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('voyager_profiles') as any).upsert({
        id: user.id,
        display_name: displayName.trim(),
        bio: null,
        avatar_url: null,
        social_x: null,
        social_instagram: null,
        social_linkedin: null,
        location: null,
        role: 'applicant',
        observation_days: 0,
        worlds_discovered: 0,
        registered_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      const utm = getFirstTouch()
      posthog.identify(user.id, { email: user.email, display_name: displayName.trim(), registered_at: new Date().toISOString() })
      posthog.capture('account_registered', {
        display_name:  displayName.trim(),
        utm_source:    utm.utm_source   ?? undefined,
        utm_medium:    utm.utm_medium   ?? undefined,
        utm_campaign:  utm.utm_campaign ?? undefined,
        utm_content:   utm.utm_content  ?? undefined,
        fbclid:        utm.fbclid       ?? undefined,
      })
    }

    router.push('/intel')
    router.refresh()
  }

  if (checking) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>VERIFYING CREDENTIALS...</div>
      </div>
    )
  }

  return (
    <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="top-bar" style={{ position: 'absolute', top: 0, left: '2.5rem', right: '2.5rem' }}>
        <div className="crumbs">PC://CONSOLE <span>/</span> IDENTITY REGISTRATION</div>
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="h-eyebrow" style={{ marginBottom: '0.5rem' }}>// INVITATION VERIFIED</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 900, color: 'var(--color-nebula)', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(232,93,4,0.4)' }}>
            ESTABLISH IDENTITY
          </div>
        </div>

        <div className="hud-frame">
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: 'rgba(245,245,245,0.35)' }}>
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ALIAS_IDENTIFIER"
                  className="input-dark"
                  maxLength={40}
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: 'rgba(245,245,245,0.35)' }}>
                  ACCESS CODE
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 8 characters"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: 'rgba(245,245,245,0.35)' }}>
                  CONFIRM ACCESS CODE
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="repeat code"
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
                className="btn-secondary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ justifyContent: 'center', fontSize: 'var(--fs-label)' }}
              >
                {loading ? '> REGISTERING...' : '[ ESTABLISH IDENTITY ]'}
              </button>
            </form>
          </div>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-deep)', opacity: 0.5 }}>
          // YOUR IDENTITY WILL BE RECORDED IN THE COLLECTIVE //
        </div>
      </div>

      <div className="footer-bar" style={{ position: 'absolute', bottom: '2rem', left: '2.5rem', right: '2.5rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
