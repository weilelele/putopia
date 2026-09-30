'use client'
import { ArchiveSheet } from '@/components/archive-sheet'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellCheck, X } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { useAuth } from '@/lib/auth-context'
import { setMyDeviceBatchFollow } from '@/lib/actions/device-batch-notifications'
import { trackDevice } from '@/lib/device-analytics'
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
    trackDevice('device_follow_clicked', { batch_slug: slug, next_followed: !followed, logged_in: !!user.id })
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
      trackDevice('device_follow_failed', { batch_slug: slug, next_followed: next, error: result.error })
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
          <ArchiveButton variant="ghost"
            aria-label="Dismiss follow confirmation"
            className={styles.iconButton}
            onClick={() => setShowConfirmation(false)}
            type="button"
          >
            <X aria-hidden size={16} />
          </ArchiveButton>
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
  return <ArchiveSheet open title={title} onClose={onClose}><p>{eyebrow}</p>{children}</ArchiveSheet>
}
