'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import posthog from 'posthog-js'
import { OnboardingSuccessScreen } from '@/components/onboarding-success-screen'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveField } from '@/components/archive-field'
import { ONBOARDING_REEL } from '@/lib/onboarding-video'
import { ONBOARDING_SUCCESS_STORAGE_KEY, type OnboardingSuccessVariant } from '@/lib/onboarding-success-experiment'
import s from './preview.module.css'

/** Uses the actual experiment UI with local browser state and no enrollment or production writes. */
export function OnboardingSuccessPreview({ variant, presentation = false }: { variant: OnboardingSuccessVariant; presentation?: boolean }) {
  const [email, setEmail] = useState('voyager@gmail.com')
  const [editing, setEditing] = useState(false)
  const [replay, setReplay] = useState(0)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmail(email.trim().toLowerCase())
    setEditing(false)
  }
  function returningVisit() {
    localStorage.setItem('putopia_pending_email', email)
    localStorage.setItem(ONBOARDING_SUCCESS_STORAGE_KEY, JSON.stringify({ variant, deviceId: posthog.get_property('$device_id') ?? 'preview-browser' }))
    window.location.assign('/new?qa=1')
  }
  return <main className={s.preview}>
    {!presentation && <aside className={s.toolbar} aria-label="Preview controls">
      <span>Preview · No email is sent · No experiment enrollment</span>
      <nav aria-label="Compare variants">
        <Link href="?variant=test" aria-current={variant === 'test' ? 'page' : undefined}>New version</Link>
        <Link href="?variant=control" aria-current={variant === 'control' ? 'page' : undefined}>Current version</Link>
        <ArchiveButton type="button" variant="ghost" size="compact" onClick={returningVisit}>Test returning visit</ArchiveButton>
        <ArchiveButton type="button" variant="ghost" size="compact" onClick={() => setReplay(value => value + 1)}>Replay entrance</ArchiveButton>
        <Link href="?variant=test&presentation=1">Full-screen preview</Link>
      </nav>
    </aside>}
    <div className={variant === 'test' && !editing ? s.invitationStage : s.stage}><div className={variant === 'test' && !editing ? s.invitationShell : s.shell}>
      {variant === 'control' && <video src={ONBOARDING_REEL.src} poster={ONBOARDING_REEL.poster} autoPlay muted loop playsInline preload="metadata" aria-label="Multiverse Console film" />}
      {editing ? <form className={s.form} onSubmit={submit}>
        <ArchiveField htmlFor="preview-email" label="YOUR EMAIL">
          <ArchiveInput id="preview-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        </ArchiveField>
        <ArchiveButton type="submit" fullWidth>Confirm email</ArchiveButton>
      </form> : <OnboardingSuccessScreen key={replay} email={email} variant={variant} onStartOver={() => setEditing(true)}
        onInitiation={() => window.location.assign('/dev/voyager-initiation?state=guest&briefing=1&qa=1')}
        onEnter={() => setEditing(true)} />}
    </div></div>
  </main>
}
