'use client'

import { useEffect, useState } from 'react'
import { ArchiveButton } from './archive-button'
import type { OnboardingSuccessVariant } from '@/lib/onboarding-success-experiment'

/* ─── Email Providers ────────────────────────────── */
const EMAIL_PROVIDERS: Record<string, { name: string; url: string }> = {
  'gmail.com':      { name: 'Gmail',        url: 'https://mail.google.com/mail/' },
  'googlemail.com': { name: 'Gmail',        url: 'https://mail.google.com/mail/' },
  'outlook.com':    { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'hotmail.com':    { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'live.com':       { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'msn.com':        { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'yahoo.com':      { name: 'Yahoo Mail',   url: 'https://mail.yahoo.com/' },
  'ymail.com':      { name: 'Yahoo Mail',   url: 'https://mail.yahoo.com/' },
  'icloud.com':     { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'me.com':         { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'mac.com':        { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'qq.com':         { name: 'QQ 邮箱',      url: 'https://mail.qq.com/' },
  'foxmail.com':    { name: 'Foxmail',      url: 'https://mail.qq.com/' },
  '163.com':        { name: '网易邮箱',     url: 'https://mail.163.com/' },
  '126.com':        { name: '网易邮箱',     url: 'https://mail.126.com/' },
  'yeah.net':       { name: '网易邮箱',     url: 'https://mail.yeah.net/' },
  'proton.me':      { name: 'Proton Mail',  url: 'https://mail.proton.me/' },
  'protonmail.com': { name: 'Proton Mail',  url: 'https://mail.proton.me/' },
}

function getEmailProvider(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? (EMAIL_PROVIDERS[domain] ?? null) : null
}

export function OnboardingSuccessScreen({
  email,
  onStartOver,
  onEnter,
  variant = 'control',
  onInitiation,
}: {
  email: string
  onStartOver: () => void
  onEnter: () => void
  variant?: OnboardingSuccessVariant
  onInitiation: () => void
}) {
  const [visible, setVisible] = useState(false)
  const provider = getEmailProvider(email)
  const test = variant === 'test'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const fadeIn: React.CSSProperties = {
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  }

  // Control preserves the inbox-first layout; test makes Initiation the next step.
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--s-5)',
      ...fadeIn,
    }}>

      {/* Status + what to do */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700,
          letterSpacing: '0.04em', color: 'var(--color-nucleus-2)',
        }}>
          SIGNAL TRANSMITTED
        </div>
        <h2 style={{
          fontFamily: 'var(--font-body)', fontWeight: 700,
          fontSize: 'var(--fs-h3)', lineHeight: 1.2,
          color: 'var(--color-star)', margin: 0,
        }}>
          {test ? 'Your initiation starts here.' : 'Check your inbox.'}
        </h2>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body)',
          color: 'var(--color-star-dim)', lineHeight: 1.5, margin: 0,
        }}>
          {test ? 'Discover the Collective, your Voyager packs, and how to join.' : 'Open the email from Multiverse Collective to activate your access.'}
        </p>
      </div>

      {test && <ArchiveButton onClick={onInitiation} fullWidth>START INITIATION</ArchiveButton>}

      {/* Where it went — the correction lives next to the address it corrects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--s-3)',
          borderTop: '1px solid var(--bd-faint)', borderBottom: '1px solid var(--bd-faint)',
          padding: 'var(--s-1) 0 var(--s-1) 0',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-1)', minWidth: 0, padding: 'var(--s-2) 0' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              color: 'var(--color-star-dim)',
            }}>
              {test ? 'Activation email sent to' : 'Sent to'}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body)', fontWeight: 700,
              color: 'var(--color-star)', overflowWrap: 'anywhere',
            }}>
              {email}
            </span>
          </div>
          <ArchiveButton
            onClick={onStartOver}
            variant="ghost"
            size="compact"
            aria-label="Change email"
            style={{ flexShrink: 0, marginRight: '-0.5rem' }}
          >
            Change
          </ArchiveButton>
        </div>
        {!test && <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          color: 'var(--color-star-dim)', lineHeight: 1.4, margin: 0,
        }}>
          Not there in a minute? Check spam or promotions.
        </p>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        {provider && (
          <a
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`archive-button archive-button--${test ? 'secondary' : 'primary'} archive-button--full`}
          >
            Open {provider.name} {!test && <span aria-hidden>↗</span>}
          </a>
        )}

        {!test && <ArchiveButton
          onClick={onEnter}
          variant="secondary"
          fullWidth
        >
          Explore before activating <span aria-hidden>→</span>
        </ArchiveButton>}
      </div>

    </div>
  )
}
