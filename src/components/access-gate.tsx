'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { getAccessStartedAt, getPendingEmail, isWindowActive, startAccessWindow } from '@/lib/access-window'
import { getEmailProvider } from '@/lib/email-providers'
import { AccessCountdown } from '@/components/access-countdown'

/**
 * "More Internal Information" gate with a granted glimpse.
 *
 * Frozen by default with a single entry — a timed look inside. Tapping it
 * unfreezes only the TOP of the feed for a 5-minute glimpse (quiet right-edge
 * countdown, re-freezes on expiry). Once a glimpse has been spent, the re-frozen
 * panel also offers "Activate now" — the way back in for good. Members never see
 * any of this.
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
  const [peeking, setPeeking] = useState(false)
  const [everUsed, setEverUsed] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [activateOpen, setActivateOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates from localStorage on mount (unavailable during SSR)
    setPendingEmail(getPendingEmail())
    const used = getAccessStartedAt() !== null
     
    setEverUsed(used)
     
    setPeeking(isWindowActive())
  }, [])

  const provider = pendingEmail ? getEmailProvider(pendingEmail) : null

  const startPeek = () => {
    posthog.capture('glimpse_start_clicked')
    startAccessWindow()
    setEverUsed(true)
    setPeeking(true)
  }

  const activate = () => {
    posthog.capture('glimpse_activate_now_clicked')
    if (pendingEmail) setActivateOpen(true)
    else window.location.href = permanentHref
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          aria-hidden={!peeking}
          style={{
            filter: peeking ? 'blur(0px)' : 'blur(7px)',
            transition: 'filter 0.6s ease-out',
            pointerEvents: peeking ? 'auto' : 'none',
            userSelect: peeking ? 'auto' : 'none',
          }}
        >
          {children}
        </div>

        {peeking ? (
          /* Only the top is unfrozen — the rest stays inside. */
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '45%',
              background:
                'linear-gradient(to bottom, rgba(10,14,39,0) 0%, rgba(10,14,39,0.55) 40%, rgba(10,14,39,0.96) 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '2.5rem',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: 'var(--color-star-dim)' }}>
              The rest stays inside — activate to see it all
            </span>
          </div>
        ) : (
          /* Frozen — single entry, plus "Activate now" once a glimpse is spent. */
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
                padding: '1.6rem 1.5rem',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nucleus)' }}>
                MULTIVERSE COLLECTIVE · INTERNAL
              </div>
              <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star)', opacity: 0.9, lineHeight: 1.65, margin: '0.8rem 0 0' }}>
                {everUsed
                  ? 'Your look has ended. Step inside for good, or take another minute.'
                  : 'For Collective members only. You’ve been granted a 5-minute viewing privilege. Will you enter?'}
              </p>

              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1.4rem' }}
                onClick={startPeek}
              >
                {everUsed ? 'Look again' : 'Yes, I will'}
              </button>

              {everUsed && (
                pendingEmail ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '0.7rem' }}
                    onClick={activate}
                  >
                    Activate now
                  </button>
                ) : (
                  <Link
                    href={permanentHref}
                    className="btn-secondary"
                    style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '0.7rem' }}
                    onClick={() => posthog.capture('glimpse_activate_now_clicked')}
                  >
                    Activate now
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {peeking && <AccessCountdown onExpire={() => setPeeking(false)} />}

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
    </>
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
