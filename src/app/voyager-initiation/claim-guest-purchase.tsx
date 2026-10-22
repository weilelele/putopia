'use client'

import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { startGuestClaim } from './claim-actions'
import styles from './confirm-guest-email.module.css'

/** Shown when the buyer's email already has an account: log in there to take the purchase. */
export function ClaimGuestPurchase({ email }: { email?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function claim() {
    setBusy(true)
    setError('')
    const result = await startGuestClaim().catch(() => ({ error: 'Your purchase could not be checked. Please try again.' }))
    if ('href' in result) { window.location.assign(result.href); return }
    setError(result.error)
    setBusy(false)
  }

  return <div className={styles.form}>
    <p>{email ? `${email} already has a Voyager account.` : 'This email already has a Voyager account.'} Log in to it and we will add this membership to that account.</p>
    {error && <p role="alert">{error}</p>}
    <ArchiveButton fullWidth loading={busy} onClick={() => void claim()}>LOG IN TO ADD MEMBERSHIP</ArchiveButton>
  </div>
}
