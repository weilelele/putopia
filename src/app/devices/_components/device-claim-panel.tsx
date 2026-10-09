'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { claimInitiationConsole } from '@/lib/actions/initiation'
import { deviceClaimState, type DeviceClaimAccess } from '@/lib/device-claim-state'
export type { DeviceClaimAccess } from '@/lib/device-claim-state'
import type { DeviceBatch } from '@/lib/device-batches'
import styles from '../../live-observation-room.module.css'

export function DeviceClaimPanel({ batch, access, ownedProgress }: {
  batch: DeviceBatch
  access: DeviceClaimAccess
  ownedProgress?: ReactNode
}) {
  const router = useRouter()
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [claimed, setClaimed] = useState(false)
  const state = deviceClaimState(access, batch.inventory)
  const full = state === 'waiting_for_capacity'
  const hasClaim = state === 'claimed' || claimed

  async function claim() {
    if (busy) return
    if (!access.consoleClaim.eligible) {
      setExplanationOpen(true)
      return
    }
    if (state !== 'claim' || hasClaim) return
    setBusy(true)
    setMessage('')
    try {
      const result = await claimInitiationConsole(batch.slug)
      if (result.error) {
        setMessage(result.error)
      } else if ((result.code === 'claimed' || result.code === 'already_claimed') && result.orderId) {
        setConfirmationOpen(false)
        setClaimed(true)
        setMessage(result.unitCode ? `Console ${result.unitCode} is assigned to you.` : 'Your Console claim is recorded.')
        router.refresh()
      } else {
        setMessage('Your claim could not be confirmed. Refresh your Console records before trying again.')
      }
    } catch {
      setMessage('The result could not be confirmed. Check My Consoles before retrying; no new payment is required.')
    } finally {
      setBusy(false)
    }
  }

  return <section className={`${styles.sectionPanel} ${styles.compactClaimPanel}`} aria-labelledby="claim-heading">
    <div className={styles.paymentHeader}><h2 id="claim-heading">CONSOLE CLAIM</h2></div>
    <div className={styles.claimCounts}>
      <div><span>BATCH TOTAL</span><strong>{batch.inventory?.listingQuantity ?? '—'}</strong></div>
      <div><span>CLAIMED</span><strong>{batch.inventory?.claimedQuantity ?? '—'}</strong></div>
    </div>
    <div className={styles.claimRow}>
      {ownedProgress ?? (hasClaim ? (
        <ArchiveLinkButton variant="primary" fullWidth className={`${styles.primaryButton} ${styles.claimButton}`} href="/devices/my-consoles">CHECK MY PROGRESS</ArchiveLinkButton>
      ) : state === 'unconfigured' ? (
        <ArchiveButton variant="primary" fullWidth className={`${styles.primaryButton} ${styles.claimButton}`} disabled>ALLOCATION NOT OPEN</ArchiveButton>
      ) : state === 'unknown' ? (
        <ArchiveButton variant="primary" fullWidth className={`${styles.primaryButton} ${styles.claimButton}`} onClick={() => router.refresh()}>RETRY ACCESS CHECK</ArchiveButton>
      ) : (
        <ArchiveButton variant="primary" fullWidth className={`${styles.primaryButton} ${styles.claimButton}`} disabled={busy || (access.consoleClaim.eligible && full)} onClick={() => access.consoleClaim.eligible ? setConfirmationOpen(true) : setExplanationOpen(true)}>{busy ? 'CLAIMING…' : access.consoleClaim.eligible && full ? 'AWAITING AVAILABILITY' : 'CLAIM A CONSOLE'}</ArchiveButton>
      ))}
    </div>
    {message ? <p className={styles.panelBody} role="status">{message}</p> : null}
    <ArchiveSheet open={confirmationOpen} onClose={() => { if (!busy) setConfirmationOpen(false) }} title="Confirm your Console" busy={busy} footer={<div className="archive-sheet__actions">
      <ArchiveButton variant="secondary" fullWidth disabled={busy} onClick={() => setConfirmationOpen(false)}>CANCEL</ArchiveButton>
      <ArchiveButton variant="primary" fullWidth disabled={busy || state !== 'claim' || hasClaim} onClick={claim}>{busy ? 'CLAIMING…' : 'CONFIRM CLAIM'}</ArchiveButton>
    </div>}>
      <p>Claim a Console from <strong>{batch.name}</strong>?</p>
      <p>This uses your Console claim. To request a different batch before shipping, contact us; changes depend on availability. You cannot switch batches yourself.</p>
      {message && <p role="alert">{message}</p>}
    </ArchiveSheet>
    <ArchiveSheet open={explanationOpen} onClose={() => setExplanationOpen(false)} title="Voyager Initiation" footer={<div className="archive-sheet__actions">
      <ArchiveButton variant="secondary" fullWidth onClick={() => setExplanationOpen(false)}>CANCEL</ArchiveButton>
      <ArchiveLinkButton variant="primary" fullWidth href={`/voyager-initiation?from=${encodeURIComponent(`/devices/batches/${batch.slug}`)}`}>{access.legacyPackPurchased ? 'CONTINUE INITIATION' : 'GO TO INITIATION'}</ArchiveLinkButton>
    </div>}>
      <p>Complete Voyager Initiation to claim a Console, subject to batch availability.</p>
      {access.legacyPackPurchased ? <p>Your Initial Pack includes the first two packs. Continue Initiation to unlock Console claiming.</p> : null}
    </ArchiveSheet>
  </section>
}
