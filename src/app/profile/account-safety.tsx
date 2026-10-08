'use client'

import { useEffect, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { deleteMyAccount } from '@/lib/actions/account-deletion'
import { listBlockedMembers, unblockMember, type BlockedMember } from '@/lib/actions/moderation'
import { DELETE_CONFIRMATION, isDeletionConfirmed } from '@/lib/account-deletion-model'
import styles from './account-safety.module.css'

export function BlockedMembersCard() {
  const [members, setMembers] = useState<BlockedMember[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    listBlockedMembers().then((list) => { if (live) setMembers(list) }).catch(() => { if (live) setMembers([]) })
    return () => { live = false }
  }, [])

  async function unblock(id: string) {
    setBusyId(id); setError('')
    const result = await unblockMember(id)
    setBusyId(null)
    if (result.error) { setError(result.error); return }
    setMembers((current) => (current ?? []).filter((m) => m.id !== id))
  }

  return (
    <ArchiveCard className={styles.card}>
      <ArchiveSectionLabel>BLOCKED MEMBERS</ArchiveSectionLabel>
      {members === null ? <p className={styles.note}>Loading…</p> : members.length === 0 ? (
        <p className={styles.note}>You have not blocked anyone. Use Block under a member&rsquo;s post to hide their content.</p>
      ) : (
        <ul className={styles.list}>
          {members.map((m) => (
            <li key={m.id}>
              <span>{m.name}</span>
              <ArchiveButton size="compact" variant="secondary" loading={busyId === m.id} onClick={() => unblock(m.id)}>UNBLOCK</ArchiveButton>
            </li>
          ))}
        </ul>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </ArchiveCard>
  )
}

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setBusy(true); setError('')
    try {
      const result = await deleteMyAccount(typed)
      if (result.error) { setError(result.error); setBusy(false); return }
      // Full reload so every client cache and session is dropped.
      window.location.assign('/welcome')
    } catch {
      setError('Result unconfirmed. Reload and check whether you are still signed in before trying again.')
      setBusy(false)
    }
  }

  return (
    <ArchiveCard className={styles.card}>
      <ArchiveSectionLabel>DELETE ACCOUNT</ArchiveSectionLabel>
      {!open ? (
        <>
          <p className={styles.note}>Permanently delete your account and personal data.</p>
          <ArchiveButton variant="destructive" onClick={() => setOpen(true)}>DELETE MY ACCOUNT</ArchiveButton>
        </>
      ) : (
        <div className={styles.confirm}>
          <p className={styles.note}>This cannot be undone. We will remove:</p>
          <ul className={styles.bullets}>
            <li>your profile, photo and sign-in</li>
            <li>your comments, chat messages and world reports (posts others replied to are blanked)</li>
            <li>your votes, notification settings and mailing-list entry</li>
          </ul>
          <p className={styles.note}>Order and shipping records are kept without a link to your account, as required for fulfilment and tax. If you hold a device, it stays registered to a deleted account.</p>
          <label htmlFor="delete-account-confirm" className={styles.note}>Type {DELETE_CONFIRMATION} to confirm</label>
          <ArchiveInput id="delete-account-confirm" value={typed} autoComplete="off" autoCapitalize="characters" onChange={(e) => setTyped(e.target.value)} />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <ArchiveButton variant="destructive" loading={busy} disabled={!isDeletionConfirmed(typed)} onClick={confirm}>DELETE FOREVER</ArchiveButton>
            <ArchiveButton variant="secondary" disabled={busy} onClick={() => { setOpen(false); setTyped(''); setError('') }}>CANCEL</ArchiveButton>
          </div>
        </div>
      )}
    </ArchiveCard>
  )
}
