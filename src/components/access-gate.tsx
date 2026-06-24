'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { getPendingEmail } from '@/lib/access-window'
import { getEmailProvider } from '@/lib/email-providers'

/**
 * "More Internal Information" gate. The device showcase sits above this, fully
 * visible; here the live Signal Feed renders frosted — you can feel it moving
 * underneath but not read it. The reward for stepping inside.
 *
 * The panel's primary action is state-aware:
 *   · email already left (ad / onboarding arrival) → "Activate your account",
 *     which opens a popup with the address, an open-inbox shortcut, and a
 *     change-email / log-in escape.
 *   · no email yet (cold / direct visit) → "Request access" (onboarding).
 * "Login" is the quiet secondary either way. Members never see this.
 *
 * Kept deliberately spare: the narrative lives in the copy and the frost, not in
 * extra mechanics (no timed peek / countdown here for now).
 */
export function AccessGate({
  children,
  permanentHref = '/new',
  loginHref = '/login',
}: {
  children: ReactNode
  permanentHref?: string
  loginHref?: string
}) {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [activateOpen, setActivateOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates from localStorage on mount (unavailable during SSR)
    setPendingEmail(getPendingEmail())
  }, [])

  const provider = pendingEmail ? getEmailProvider(pendingEmail) : null

  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-hidden
        style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {children}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10,14,39,0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            margin: 'clamp(1.5rem, 8vh, 4rem) 1.25rem',
            maxWidth: 380,
            width: '100%',
            background: 'rgba(14,18,40,0.82)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem 1.5rem',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nucleus)' }}>
            MORE INTERNAL INFORMATION
          </div>
          <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star)', opacity: 0.85, lineHeight: 1.6, margin: '0.7rem 0 0' }}>
            The channel keeps moving. Most of it stays inside.
          </p>

          {pendingEmail ? (
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.4rem' }}
              onClick={() => { posthog.capture('gate_activate_clicked'); setActivateOpen(true) }}
            >
              Activate your account
            </button>
          ) : (
            <Link
              href={permanentHref}
              className="btn-primary"
              style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1.4rem' }}
              onClick={() => posthog.capture('gate_request_access_clicked')}
            >
              Request access
            </Link>
          )}

          <Link
            href={loginHref}
            style={{ display: 'block', marginTop: '0.85rem', color: 'var(--color-star-dim)', fontSize: 'var(--fs-label)' }}
            onClick={() => posthog.capture('gate_login_clicked')}
          >
            Login
          </Link>
        </div>
      </div>

      {activateOpen && (
        <ActivateModal
          email={pendingEmail}
          providerName={provider?.name}
          providerUrl={provider?.url}
          changeHref={permanentHref}
          loginHref={loginHref}
          onClose={() => setActivateOpen(false)}
        />
      )}
    </div>
  )
}

function ActivateModal({
  email,
  providerName,
  providerUrl,
  changeHref,
  loginHref,
  onClose,
}: {
  email: string | null
  providerName?: string
  providerUrl?: string
  changeHref: string
  loginHref: string
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Activate your account"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(8,11,26,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 320,
          width: '100%',
          background: 'var(--bg-panel)',
          border: '1px solid var(--bd-orange)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem 1.25rem',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <MailGlyph />
        <p style={{ fontSize: 'var(--fs-title)', color: 'var(--color-star)', margin: '0.6rem 0 0' }}>
          Activate your account
        </p>
        <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', margin: '0.5rem 0 0' }}>
          We sent a link to
        </p>
        {email && (
          <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-nucleus)', margin: '0.2rem 0 0', wordBreak: 'break-all' }}>
            {email}
          </p>
        )}

        <a
          href={providerUrl ?? '#'}
          target={providerUrl ? '_blank' : undefined}
          rel={providerUrl ? 'noopener noreferrer' : undefined}
          className="btn-primary"
          style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1.1rem' }}
          onClick={() => posthog.capture('activate_open_inbox_clicked', { provider: providerName ?? 'unknown' })}
        >
          {providerName ? `Open ${providerName} →` : 'Open your email →'}
        </a>

        <div style={{ borderTop: '1px solid var(--bd-faint)', margin: '1rem 0 0.85rem' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: 'var(--fs-caption)' }}>
          <Link href={changeHref} style={{ color: 'var(--color-star-dim)' }} onClick={() => posthog.capture('activate_change_email_clicked')}>
            Use a different email
          </Link>
          <span style={{ color: 'var(--color-star-deep)' }}>·</span>
          <Link href={loginHref} style={{ color: 'var(--color-star-dim)' }} onClick={() => posthog.capture('activate_login_clicked')}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}

function MailGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: 'inline-block' }}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="var(--color-nucleus)" strokeWidth="1.4" />
      <path d="m4 7 8 6 8-6" stroke="var(--color-nucleus)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
