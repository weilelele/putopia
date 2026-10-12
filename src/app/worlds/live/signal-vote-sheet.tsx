'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { SIGNAL_DESCRIPTION_QUESTION } from '@/components/signal-description'
import type { PublicInvestigation } from '@/lib/actions/signal-tasks'
import { formatTimeLeft, voteCta } from '@/lib/signal-vote'
import styles from './signal-vote-sheet.module.css'

type Day = PublicInvestigation['days'][number]

const VOTING_RULE = 'Voting stays open for 36 hours. At least one response is needed to continue.'

/**
 * One Signal Dispatch vote, grouped by what the viewer needs in order:
 * where this is (round, status, time left) → which world → the original
 * description → the question and its options → one sticky action with its hint.
 */
export function SignalVoteSheet({
  investigation, day, loggedIn, pendingChoice, onChoose, onConfirm, onRequireAuth, onClose, busy, error, unknown,
}: {
  investigation: PublicInvestigation
  day: Day | undefined
  loggedIn: boolean
  pendingChoice: string
  onChoose: (assetId: string) => void
  onConfirm: () => void
  onRequireAuth: () => void
  onClose: () => void
  busy: boolean
  error: string
  unknown: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(0)
  useEffect(() => { void Promise.resolve().then(() => setNow(Date.now())) }, [])

  if (!day) {
    return (
      <ArchiveSheet open onClose={onClose} title="Signal vote">
        <p className={styles.hint}>This vote has closed. Open the world record to review its history.</p>
      </ArchiveSheet>
    )
  }

  const task = day.task
  const options = task.assets.filter((asset) => asset.asset_role === 'option')
  const selectedIndex = options.findIndex((asset) => asset.id === pendingChoice)
  const cta = voteCta({
    loggedIn, canRespond: task.canRespond, closed: task.closed, initiatorOnly: !!task.initiatorOnly,
    mySelection: task.mySelection, selectedNumber: selectedIndex >= 0 ? selectedIndex + 1 : null,
  })
  // Members who cannot vote may still look at the options; guests may try them.
  const locked = !!task.mySelection || task.closed
  const timeLeft = now ? formatTimeLeft(task.closeAt, now) : null
  const description = investigation.description?.trim() || 'The original description is unavailable.'
  const long = description.length > 220
  // Dreamcatcher worlds are named with the first words of their description; don't say it twice.
  const showTitle = !description.startsWith(investigation.title.trim().replace(/…$/, '').slice(0, 60))

  return (
    <ArchiveSheet open onClose={onClose} title="Signal vote" dirty={!unknown && !!pendingChoice && !task.mySelection} busy={busy}>
      <div className={styles.meta}>
        <span>ROUND {task.roundNumber ?? day.dayIndex + 1}</span>
        <span>·</span>
        <strong>{task.closed ? 'VOTE CLOSED' : 'VOTE OPEN'}</strong>
        {timeLeft && !task.closed && <><span>·</span><span>{timeLeft}</span></>}
      </div>
      {showTitle && <h3 className={styles.title}>{investigation.title}</h3>}

      <section className={styles.section} aria-label="Original description">
        <span className={styles.label}>ORIGINAL DESCRIPTION</span>
        <p className={`${styles.description}${long && !expanded ? ` ${styles.clamped}` : ''}`}>{description}</p>
        {long && <button type="button" className={styles.more} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>{expanded ? 'SHOW LESS' : 'READ MORE'}</button>}
      </section>

      <section className={styles.section} aria-label="Signal options">
        <p className={styles.question}>{SIGNAL_DESCRIPTION_QUESTION}</p>
        <div className={styles.grid}>
          {options.map((asset, index) => (
            <button key={asset.id} type="button" className={styles.tile} aria-label={`Select signal ${index + 1}`}
              aria-pressed={pendingChoice === asset.id || task.mySelection === asset.id} disabled={locked} onClick={() => onChoose(asset.id)}>
              {asset.processed_url && asset.media === 'video'
                ? <video autoPlay loop muted playsInline poster={asset.display_url ?? undefined} preload="metadata" src={asset.processed_url} />
                : asset.display_url || asset.processed_url
                  ? <Image alt="" fill src={(asset.display_url ?? asset.processed_url)!} unoptimized />
                  : null}
              <span className={styles.tileLabel}>SIGNAL {String(index + 1).padStart(2, '0')}</span>
              {(pendingChoice === asset.id || task.mySelection === asset.id) && <span className={styles.check}><Check aria-hidden size={20} /></span>}
            </button>
          ))}
        </div>
        <p className={styles.rules}>{VOTING_RULE}</p>
      </section>

      <div className={styles.footer}>
        {error ? <p role="alert" className={styles.error}>{error}</p> : <p className={styles.hint}>{cta.hint}</p>}
        {unknown
          ? <ArchiveButton variant="primary" fullWidth onClick={() => window.location.reload()}>RELOAD AND CHECK SIGNAL</ArchiveButton>
          : <ArchiveButton variant="primary" fullWidth loading={busy} disabled={cta.disabled}
              onClick={() => (cta.promptAuth ? onRequireAuth() : onConfirm())}>{cta.label}</ArchiveButton>}
      </div>
    </ArchiveSheet>
  )
}
