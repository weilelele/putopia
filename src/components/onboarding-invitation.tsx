'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArchiveButton } from './archive-button'
import s from './onboarding-invitation.module.css'

/** One-shot, silent entrance. Loading/error timeouts always leave the actions usable. */
export function OnboardingInvitation({ email, provider, onInitiation, onStartOver }: {
  email: string
  provider: { name: string; url: string } | null
  onInitiation: () => void
  onStartOver: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'opening' | 'complete'>('loading')

  useEffect(() => {
    if (phase === 'complete') return
    const timeout = setTimeout(() => setPhase('complete'), phase === 'loading' ? 1200 : 4400)
    return () => clearTimeout(timeout)
  }, [phase])

  return <section className={s.invitation} data-phase={phase} aria-labelledby="invitation-title"
    onKeyDown={event => { if (event.key === 'Escape') setPhase('complete') }}>
    <div className={s.scene} aria-hidden="true">
      <div className={s.reveal}>
        <Image src="/assets/onboarding/invitation-scene-20261120.png" alt="" fill preload
          sizes="(min-width: 640px) 480px, 100vw"
          onLoad={() => setPhase(current => current === 'loading' ? 'opening' : current)}
          onError={() => setPhase('complete')} />
      </div>
    </div>
    <div className={s.layout}>
      <header className={s.copy}>
        <p className={s.label}>MULTIVERSE COLLECTIVE</p>
        <h2 id="invitation-title">Your initiation<br />starts here.</h2>
        <p className={s.description}>Meet the Collective.<br />See what comes next.</p>
      </header>
      <div className={s.actions}>
        <div className={s.primary}>
          <ArchiveButton fullWidth onClick={onInitiation}>START INITIATION</ArchiveButton>
        </div>
        <div className={s.emailRow} onAnimationEnd={event => {
          if (event.target === event.currentTarget) setPhase('complete')
        }}>
          <div className={s.emailInfo}>
            <p>Activation email sent to</p>
            <div className={s.address}>
              <strong>{email}</strong>
              <ArchiveButton variant="ghost" size="compact" onClick={onStartOver} aria-label="Change email">Change</ArchiveButton>
            </div>
          </div>
          {provider ? <a className={`archive-button archive-button--secondary ${s.mailbox}`}
            href={provider.url} target="_blank" rel="noopener noreferrer">Open {provider.name}</a>
            : <span className={s.emailHint}>Open your email app</span>}
        </div>
      </div>
    </div>
  </section>
}
