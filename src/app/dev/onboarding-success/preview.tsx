'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { OnboardingSuccessScreen } from '@/components/onboarding-success-screen'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveField } from '@/components/archive-field'
import { ONBOARDING_REEL } from '@/lib/onboarding-video'
import type { OnboardingSuccessVariant } from '@/lib/onboarding-success-experiment'
import s from './preview.module.css'

/** Uses the actual experiment UI with local state and no enrollment or writes. */
export function OnboardingSuccessPreview({ variant }: { variant: OnboardingSuccessVariant }) {
  const [email, setEmail] = useState('voyager@gmail.com')
  const [editing, setEditing] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmail(email.trim().toLowerCase())
    setEditing(false)
  }
  return <main className={s.preview}>
    <aside className={s.toolbar} aria-label="Preview controls">
      <span>Preview · No email is sent · No experiment enrollment</span>
      <nav aria-label="Compare variants">
        <Link href="?variant=test" aria-current={variant === 'test' ? 'page' : undefined}>New version</Link>
        <Link href="?variant=control" aria-current={variant === 'control' ? 'page' : undefined}>Current version</Link>
      </nav>
    </aside>
    <div className={s.stage}><div className={s.shell}>
      <video src={ONBOARDING_REEL.src} poster={ONBOARDING_REEL.poster} autoPlay muted loop playsInline preload="metadata" aria-label="Multiverse Console film" />
      {editing ? <form className={s.form} onSubmit={submit}>
        <ArchiveField htmlFor="preview-email" label="YOUR EMAIL">
          <ArchiveInput type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        </ArchiveField>
        <ArchiveButton type="submit" fullWidth>Confirm email</ArchiveButton>
      </form> : <OnboardingSuccessScreen email={email} variant={variant} onStartOver={() => setEditing(true)}
        onInitiation={() => window.location.assign('/dev/voyager-initiation?state=guest&briefing=1&qa=1')}
        onEnter={() => setEditing(true)} />}
    </div></div>
  </main>
}
