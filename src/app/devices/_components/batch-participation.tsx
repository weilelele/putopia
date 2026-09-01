'use client'

import { useState, useTransition } from 'react'
import { Check, Vote } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import {
  castDeviceBatchVote,
  type DeviceBatchDecision,
} from '@/lib/actions/device-batch-community'
import type { DeviceBatch } from '@/lib/device-batches'
import styles from '../device-batches.module.css'

export function BatchParticipation({
  batch,
  decision,
}: {
  batch: DeviceBatch
  decision: DeviceBatchDecision | null
}) {
  const [selectedOption, setSelectedOption] = useState(decision?.selectedOption ?? '')
  const [recordedOption, setRecordedOption] = useState(decision?.selectedOption ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalVotes = decision?.options.reduce((sum, option) => sum + option.votes, 0) ?? 0

  function recordVote() {
    if (!decision || !selectedOption) return
    setError('')
    startTransition(async () => {
      const result = await castDeviceBatchVote(batch.slug, decision.id, selectedOption)
      if (result.error) setError(result.error)
      else setRecordedOption(selectedOption)
    })
  }

  const closesLabel = decision?.closesAt
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(decision.closesAt))
    : null

  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHeadingRow}>
        <ArchiveSectionLabel>HOLDER DECISION</ArchiveSectionLabel>
        <span>{decision ? (closesLabel ? `CLOSES ${closesLabel.toUpperCase()}` : 'OPEN DECISION') : 'NO ACTIVE DECISION'}</span>
      </div>

      {decision ? (
        <div className={styles.decisionCard}>
          <div className={styles.decisionIntro}>
            <Vote aria-hidden size={18} />
            <div>
              <h2>{decision.title}</h2>
              <p>{decision.summary}</p>
            </div>
          </div>

          <div className={styles.decisionOptions}>
            {decision.options.map((option) => {
              const originalOption = decision.selectedOption
              const optionVotes = option.votes
                - (originalOption === option.id && recordedOption !== originalOption ? 1 : 0)
                + (recordedOption === option.id && recordedOption !== originalOption ? 1 : 0)
              const adjustedTotal = totalVotes + (!originalOption && recordedOption ? 1 : 0)
              const percentage = adjustedTotal ? Math.round((optionVotes / adjustedTotal) * 100) : 0

              return (
                <button
                  aria-pressed={selectedOption === option.id}
                  className={selectedOption === option.id ? styles.decisionOptionSelected : ''}
                  disabled={!decision.canVote || isPending}
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  type="button"
                >
                  <span className={styles.decisionMarker}>
                    {selectedOption === option.id ? <Check aria-hidden size={14} /> : null}
                  </span>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                  <em>{percentage}%</em>
                </button>
              )
            })}
          </div>

          <div className={styles.decisionFooter}>
            <span>{totalVotes + (!decision.selectedOption && recordedOption ? 1 : 0)} HOLDERS PARTICIPATED</span>
            {recordedOption && recordedOption === selectedOption ? (
              <strong>
                <Check aria-hidden size={14} /> VOTE RECORDED
              </strong>
            ) : (
              <ArchiveButton disabled={!selectedOption || !decision.canVote || isPending} onClick={recordVote}>
                {isPending ? 'RECORDING…' : 'CAST VOTE'}
              </ArchiveButton>
            )}
          </div>
          {error ? <p aria-live="polite">{error}</p> : null}
          {!decision.canVote && !recordedOption ? (
            <p>Payment-confirmed holders can participate in this decision.</p>
          ) : null}
        </div>
      ) : (
        <div className={styles.emptyArchive}>
          Holder decisions open after claims begin. Follow this batch for the next field
          question.
        </div>
      )}
    </section>
  )
}
