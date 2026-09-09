'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArchiveSheet } from '@/components/archive-sheet'
import posthog from 'posthog-js'
import { getPendingEmail } from '@/lib/access-window'
import { getEmailProvider } from '@/lib/email-providers'

/**
 * Shared "get full access" action. A visitor who has already left an email gets
 * the activation popup (their address + a deep-link to their inbox + change /
 * log-in escapes); a cold visitor is sent to onboarding to leave one. Used by
 * both the homepage REQUEST ACCESS button and the gate's GET FULL ACCESS, so the
 * rule is identical everywhere: returning emailers are guided to their inbox.
 *
 * Returns `trigger(source)` to wire to a button and `modal` to render.
 */
export function useActivateAccess(permanentHref = '/new', loginHref = '/login') {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates from localStorage on mount (unavailable during SSR)
    setPendingEmail(getPendingEmail())
  }, [])

  const trigger = (source: string) => {
    posthog.capture('activate_access_clicked', { source, has_email: !!pendingEmail })
    if (pendingEmail) setOpen(true)
    else window.location.href = permanentHref
  }

  const provider = pendingEmail ? getEmailProvider(pendingEmail) : null
  const modal = open ? (
    <ActivateModal
      email={pendingEmail}
      providerName={provider?.name}
      providerUrl={provider?.url}
      changeHref={permanentHref}
      loginHref={loginHref}
      onClose={() => setOpen(false)}
    />
  ) : null

  return { trigger, modal, pendingEmail }
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
    <ArchiveSheet open title="Activate your account" onClose={onClose}>
        <MailGlyph />
        <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', margin: '0.5rem 0 0' }}>
          We sent a link to
        </p>
        {email && (
          <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-nucleus)', margin: '0.2rem 0 0', wordBreak: 'break-all' }}>
            {email}
          </p>
        )}

        {providerUrl ? <a
          href={providerUrl}
          target={providerUrl ? '_blank' : undefined}
          rel={providerUrl ? 'noopener noreferrer' : undefined}
          className="btn-primary"
          style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1.1rem' }}
          onClick={() => posthog.capture('activate_open_inbox_clicked', { provider: providerName ?? 'unknown' })}
        >
          {providerName ? `Open ${providerName} →` : 'Open your email →'}
        </a> : <p>Open your email app to find your activation link.</p>}

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
      </ArchiveSheet>
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
