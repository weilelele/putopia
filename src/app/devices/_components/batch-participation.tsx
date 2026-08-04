'use client'

import { useState } from 'react'
import { Check, Vote } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { getBatchDecision } from '@/lib/batch-participation'
import type { DeviceBatch } from '@/lib/device-batches'
import styles from '../device-batches.module.css'

export function BatchParticipation({ batch }: { batch: DeviceBatch }) {
  const decision = getBatchDecision(batch.slug)
  const [selectedOption, setSelectedOption] = useState('')
  const [voteRecorded, setVoteRecorded] = useState(false)

  const totalVotes = decision?.options.reduce((sum, option) => sum + option.votes, 0) ?? 0

  function recordVote() {
    if (!decision || !selectedOption) return
    setVoteRecorded(true)
  }

  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHeadingRow}>
        <ArchiveSectionLabel>HOLDER DECISION</ArchiveSectionLabel>
        <span>{decision ? `CLOSES ${decision.closesAt.toUpperCase()}` : 'NO ACTIVE DECISION'}</span>
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
              const optionVotes =
                option.votes + (voteRecorded && selectedOption === option.id ? 1 : 0)
              const adjustedTotal = totalVotes + (voteRecorded ? 1 : 0)
              const percentage = Math.round((optionVotes / adjustedTotal) * 100)

              return (
                <button
                  aria-pressed={selectedOption === option.id}
                  className={selectedOption === option.id ? styles.decisionOptionSelected : ''}
                  disabled={voteRecorded}
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
            <span>{totalVotes + (voteRecorded ? 1 : 0)} HOLDERS PARTICIPATED</span>
            {voteRecorded ? (
              <strong>
                <Check aria-hidden size={14} /> VOTE RECORDED
              </strong>
            ) : (
              <ArchiveButton disabled={!selectedOption} onClick={recordVote}>
                CAST VOTE
              </ArchiveButton>
            )}
          </div>
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
