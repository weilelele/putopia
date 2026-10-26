'use client'

import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { createClient } from '@/lib/supabase/client'
import styles from './confirm-guest-email.module.css'
import { ClaimGuestPurchase } from './claim-guest-purchase'
import { guestEmailOutcome, normalizeGuestEmail, type GuestEmailOutcome } from '@/lib/guest-checkout'

const messages: Record<Exclude<GuestEmailOutcome, 'sent' | 'exists'>, string> = {
  rate_limited: 'Too many emails were requested. Please wait a few minutes and try again.',
  failed: 'The confirmation email could not be sent. Please try again.',
}

/**
 * Links an email to an anonymous checkout session. The account becomes
 * permanent when the buyer opens the link; /register then sets the access code.
 */
export function ConfirmGuestEmail({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [existing, setExisting] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const normalized = normalizeGuestEmail(email)
    if (!normalized) { setError('Enter a valid email address.'); return }
    setBusy(true)
    setError('')
    const { error: updateError } = await createClient().auth.updateUser({ email: normalized }, { emailRedirectTo: `${window.location.origin}/auth/callback` })
    const outcome = guestEmailOutcome(updateError)
    if (outcome === 'sent') setSentTo(normalized)
    else if (outcome === 'exists') setExisting(normalized)
    else setError(messages[outcome])
    setBusy(false)
  }

  if (existing) return <ClaimGuestPurchase email={existing} />
  if (sentTo) return <p role="status">Check {sentTo} for a confirmation link. Open it to set your access code and keep your membership.</p>
  return <form className={styles.form} onSubmit={submit} noValidate>
    <p>Confirm your email to keep your membership. Until you do, it is saved only in this browser.</p>
    <ArchiveField htmlFor="guest-email" label="EMAIL" error={error || undefined}>
      <ArchiveInput type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />
    </ArchiveField>
    <ArchiveButton type="submit" fullWidth loading={busy}>SEND CONFIRMATION LINK</ArchiveButton>
  </form>
}
