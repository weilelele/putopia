'use client'

import { ArchiveInput } from '@/components/archive-input'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'
import { getFirstTouch } from '@/lib/utm'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { syncLoopsRegistration } from '@/lib/actions/profile'
import { getOrAssignExperimentGroup } from '@/lib/actions/experiment'
import { trackRedditSignUp } from '@/lib/actions/reddit-ads'
import { trackRedditPixelEvent } from '@/lib/reddit-pixel'
import { safeAppPath } from '@/lib/ui-navigation'
import { takePostRegisterRedirect } from '@/lib/post-register-redirect'
import { activateAccount, checkActivationLink } from '@/lib/actions/activation'

async function trackRegistration(userId: string, email: string | undefined, displayName: string) {
  const experimentGroup = await getOrAssignExperimentGroup()
  if (email) {
    syncLoopsRegistration(email, displayName, userId).catch(() => {})
  }
  const utm = getFirstTouch()
  const redditResult = await trackRedditSignUp(utm.rdt_cid)
  if (redditResult.conversionId) {
    trackRedditPixelEvent('SignUp', redditResult.conversionId)
  }
  posthog.identify(userId, { email, display_name: displayName, registered_at: new Date().toISOString() })
  posthog.capture('account_registered', {
    experiment_group:  experimentGroup ?? undefined,
    display_name:  displayName,
    utm_source:    utm.utm_source   ?? undefined,
    utm_medium:    utm.utm_medium   ?? undefined,
    utm_campaign:  utm.utm_campaign ?? undefined,
    utm_content:   utm.utm_content  ?? undefined,
    fbclid:        utm.fbclid       ?? undefined,
  })
}

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  // Activation links (?key=) need no session: the account signs in once its password is set.
  const [activationKey, setActivationKey] = useState<string | null>(null)
  const router = useRouter()

  // Guard: an activation link that can still set a password, or an active session (older invite links via /auth/callback)
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key')
    if (key) {
      checkActivationLink(key).then(({ status, next }) => {
        if (status === 'expired') router.replace('/auth/expired')
        else if (status === 'activated') router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login')
        else { setActivationKey(key); setChecking(false) }
      })
      return
    }
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
    try {
      await register()
    } catch {
      setError('ERR: REGISTRATION COULD NOT BE COMPLETED. PLEASE TRY AGAIN.')
      setLoading(false)
    }
  }

  const register = async () => {
    const supabase = createClient()
    let activatedNext: string | null = null

    if (activationKey) {
      // The server sets the password and profile, then this browser signs in with it.
      const activated = await activateAccount(activationKey, displayName, password)
      if (!activated.ok) {
        if (activated.reason === 'expired') { router.replace('/auth/expired'); return }
        setError(activated.message)
        setLoading(false)
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: activated.email, password })
      if (signInError) {
        setError('ERR: ACCOUNT ACTIVATED. PLEASE LOG IN WITH YOUR NEW ACCESS CODE.')
        setLoading(false)
        return
      }
      activatedNext = activated.next
    } else {
      // Set password on the invite-created account
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { display_name: displayName.trim() },
      })

      // A retry after a half-finished attempt resends the password that is already set.
      if (updateError && updateError.code !== 'same_password') {
        setError(`ERR: ${updateError.message.toUpperCase()}`)
        setLoading(false)
        return
      }
    }

    // Create voyager profile (activation links already did, on the server)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = activationKey ? { error: null } : await (supabase.from('voyager_profiles') as any).upsert({
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
      if (profileError) {
        setError('ERR: PROFILE COULD NOT BE SAVED. PLEASE TRY AGAIN.')
        setLoading(false)
        return
      }
      // Tracking is best effort: it must never keep a registered account on this screen.
      const tracking = trackRegistration(user.id, user.email ?? undefined, displayName.trim()).catch(() => {})
      await Promise.race([tracking, new Promise((resolve) => setTimeout(resolve, 3000))])
    }

    const requested = activatedNext ?? new URLSearchParams(window.location.search).get('redirect')
    let remembered: string | null = null
    try { remembered = takePostRegisterRedirect(localStorage, window.location.origin, Date.now()) } catch { /* Storage is a convenience only. */ }
    const destination = safeAppPath(requested, window.location.origin) ?? remembered ?? '/console'
    // Full load: the client router cache can still hold the pre-registration redirect back to /register.
    window.location.assign(destination === '/login' || destination === '/register' ? '/console' : destination)
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

      <div className="archive-auth-shell">
        <header className="archive-auth-heading">
          <p>{activationKey ? 'ACTIVATE ACCOUNT' : 'INVITATION VERIFIED'}</p>
          <h1>ESTABLISH <span>IDENTITY</span></h1>
        </header>

        <form onSubmit={handleSubmit} className="archive-auth-form">
          <ArchiveField htmlFor="register-display-name" label="DISPLAY NAME">
            <ArchiveInput
              id="register-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or alias"
              maxLength={40}
            />
          </ArchiveField>

          <ArchiveField htmlFor="register-password" label="ACCESS CODE">
            <ArchiveInput
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </ArchiveField>

          <ArchiveField htmlFor="register-password-confirm" label="CONFIRM ACCESS CODE">
            <ArchiveInput
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
