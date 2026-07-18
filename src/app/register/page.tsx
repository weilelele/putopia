'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'
import { getFirstTouch } from '@/lib/utm'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { syncLoopsRegistration } from '@/lib/actions/profile'
import { getOrAssignExperimentGroup } from '@/lib/actions/experiment'

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
        email: user.email?.toLowerCase() ?? null,
        registered_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      const experimentGroup = await getOrAssignExperimentGroup()
      if (user.email) {
        syncLoopsRegistration(user.email, displayName.trim(), user.id).catch(() => {})
      }
      const utm = getFirstTouch()
      posthog.identify(user.id, { email: user.email, display_name: displayName.trim(), registered_at: new Date().toISOString() })
      posthog.capture('account_registered', {
        experiment_group:  experimentGroup ?? undefined,
        display_name:  displayName.trim(),
        utm_source:    utm.utm_source   ?? undefined,
        utm_medium:    utm.utm_medium   ?? undefined,
        utm_campaign:  utm.utm_campaign ?? undefined,
        utm_content:   utm.utm_content  ?? undefined,
        fbclid:        utm.fbclid       ?? undefined,
      })
    }

    router.push('/console')
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
    <main className="main pilot-archive-page archive-auth-page">
      <ArchiveBrandHeader />
      <div className="archive-auth-shell">
        <header className="archive-auth-heading">
          <p>INVITATION VERIFIED</p>
          <h1>ESTABLISH <span>IDENTITY</span></h1>
        </header>

        <form onSubmit={handleSubmit} className="archive-auth-form">
          <ArchiveField htmlFor="register-display-name" label="DISPLAY NAME">
            <input
              id="register-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or alias"
              maxLength={40}
            />
          </ArchiveField>

          <ArchiveField htmlFor="register-password" label="ACCESS CODE">
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </ArchiveField>

          <ArchiveField htmlFor="register-password-confirm" label="CONFIRM ACCESS CODE">
            <input
              id="register-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat access code"
            />
          </ArchiveField>

          {error && <div className="archive-form-message is-error" role="alert">{error}</div>}

          <ArchiveButton disabled={loading} fullWidth type="submit">
            {loading ? 'REGISTERING...' : 'ESTABLISH IDENTITY'}
          </ArchiveButton>
        </form>
      </div>
    </main>
  )
}
