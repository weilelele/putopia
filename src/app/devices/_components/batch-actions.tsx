'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellCheck, X } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { useAuth } from '@/lib/auth-context'
import { setMyDeviceBatchFollow } from '@/lib/actions/device-batch-notifications'
import { setBatchFollowed } from '@/lib/device-batch-follows'
import { useFollowedBatchSlugs } from './use-followed-batches'
import styles from '../device-batches.module.css'

export function FollowBatchButton({
  batchName,
  compact = false,
  label = 'FOLLOW',
  prominence = 'ghost',
  slug,
}: {
  batchName: string
  compact?: boolean
  label?: string
  prominence?: 'primary' | 'secondary' | 'ghost'
  slug: string
}) {
  const router = useRouter()
  const { user } = useAuth()
  const followed = useFollowedBatchSlugs().includes(slug)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function toggleFollow() {
    if (!user.id) {
      router.push(`/login?redirect=${encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      )}`)
      return
    }

    const next = !followed
    setBatchFollowed(slug, next)
    setBusy(true)
    setMessage('')
    const result = await setMyDeviceBatchFollow(slug, next)
    setBusy(false)
    if (result.error) {
      setBatchFollowed(slug, followed)
      setMessage(result.error)
      setShowConfirmation(true)
      return
    }
    setShowConfirmation(next)
    setMessage('Following saved. Major Batch updates are active.')
  }

  return (
    <div className={`${styles.followControl}${compact ? ` ${styles.followControlCompact}` : ''}`}>
      <ArchiveButton
        aria-pressed={followed}
        className={styles.followButton}
        disabled={busy}
        onClick={toggleFollow}
        variant={followed ? 'secondary' : prominence}
      >
        {followed ? <BellCheck aria-hidden size={15} /> : <Bell aria-hidden size={15} />}
        {busy ? 'SAVING…' : followed ? 'FOLLOWING' : label}
      </ArchiveButton>

      {showConfirmation && followed && (
        <div className={styles.followConfirmation} role="status">
          <span>
            <strong>{batchName}</strong> · {message}
          </span>
          <button
            aria-label="Dismiss follow confirmation"
            className={styles.iconButton}
            onClick={() => setShowConfirmation(false)}
            type="button"
          >
            <X aria-hidden size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export function ArchiveModal({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: React.ReactNode
  eyebrow: string
  onClose: () => void
  title: string
}) {
  return (
    <div
      aria-labelledby="device-batch-modal-title"
      aria-modal="true"
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
      role="dialog"
    >
      <div className={styles.modalPanel}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.eyebrow}>{eyebrow}</div>
            <h2 id="device-batch-modal-title">{title}</h2>
          </div>
          <button aria-label="Close dialog" className={styles.modalClose} onClick={onClose} type="button">
            <X aria-hidden size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}
