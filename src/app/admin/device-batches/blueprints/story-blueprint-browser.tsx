'use client'

import { FormEvent, useState } from 'react'
import { STORY_BLUEPRINTS } from './story-blueprints'
import styles from './story-blueprints.module.css'

const FACT_GROUPS = [
  { id: 'confirmed', label: 'Confirmed', tone: 'confirmed' },
  { id: 'estimates', label: 'Current Estimates', tone: 'estimated' },
  { id: 'questions', label: 'To Be Verified', tone: 'unresolved' },
] as const

export function StoryBlueprintBrowser() {
  const [activeId, setActiveId] = useState(STORY_BLUEPRINTS[0].id)
  const [suggestion, setSuggestion] = useState('')
  const [submission, setSubmission] = useState<{
    state: 'idle' | 'running' | 'success' | 'error'
    message: string
  }>({ state: 'idle', message: '' })
  const active = STORY_BLUEPRINTS.find((batch) => batch.id === activeId) ?? STORY_BLUEPRINTS[0]

  async function submitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedSuggestion = suggestion.trim()
    if (!trimmedSuggestion || submission.state === 'running') return

    setSubmission({
      state: 'running',
      message: 'Codex is reading the worldbuilding references, checking continuity, and revising this Batch. This usually takes one to several minutes.',
    })

    try {
      const response = await fetch('/api/admin/device-batch-blueprints/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: active.id,
          suggestion: trimmedSuggestion,
        }),
      })
      const result = await response.json() as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(result.error || 'Codex did not complete this revision.')
      }

      setSuggestion('')
      setSubmission({
        state: 'success',
        message: result.message || 'Codex completed the revision. Refresh the page to view the latest blueprint.',
      })
    } catch (error) {
      setSubmission({
        state: 'error',
        message: error instanceof Error ? error.message : 'Submission failed. Please try again.',
      })
    }
  }

  function selectBatch(batchId: string) {
    setActiveId(batchId)
    setSubmission({ state: 'idle', message: '' })
  }

  return (
    <>
      <section aria-label="Compare three Batches" className={styles.comparisonGrid}>
        {STORY_BLUEPRINTS.map((batch) => {
          const isActive = batch.id === active.id

          return (
            <button
              aria-pressed={isActive}
              className={`${styles.comparisonCard} ${isActive ? styles.comparisonCardActive : ''}`}
              key={batch.id}
              onClick={() => selectBatch(batch.id)}
              type="button"
            >
              <span className={styles.cardIndex}>{batch.index}</span>
              <span className={styles.cardCopy}>
                <strong>{batch.name}</strong>
                <span>{batch.workingTitle}</span>
                <small>{batch.emotionalCore}</small>
              </span>
              <span aria-hidden="true" className={styles.miniPalette}>
                {batch.palette.length > 0
                  ? batch.palette.map((color) => (
                      <i key={color.name} style={{ backgroundColor: color.value }} />
                    ))
                  : <em>COLOR PENDING</em>}
              </span>
            </button>
          )
        })}
      </section>

      <article className={styles.blueprint}>
        <header className={styles.blueprintHeader}>
          <div>
            <span className={styles.kicker}>BATCH {active.index} · STORY BLUEPRINT</span>
            <h2>{active.name}</h2>
            <p className={styles.workingTitle}>{active.workingTitle} (working title)</p>
          </div>
          <dl className={styles.identity}>
            <div>
              <dt>Location</dt>
              <dd>{active.location}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{active.period}</dd>
            </div>
            <div>
              <dt>Emotional Core</dt>
              <dd>{active.emotionalCore}</dd>
            </div>
          </dl>
        </header>

        <section className={styles.storyLead}>
          <div>
            <span className={styles.sectionLabel}>Story Blueprint</span>
            <p>{active.story}</p>
          </div>
          <blockquote>
            <span>Content Engine</span>
            {active.engine}
          </blockquote>
        </section>

        <section className={styles.paletteSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>Visual Identity</span>
              <h3>Batch Color Specification</h3>
            </div>
            <p>Approved colors to be entered · atmosphere guidance remains provisional</p>
          </div>
          {active.palette.length > 0
            ? (
                <div className={styles.paletteGrid}>
                  {active.palette.map((color) => (
                    <div className={styles.swatch} key={color.name}>
                      <span style={{ backgroundColor: color.value }} />
                      <strong>{color.name}</strong>
                      <small>{color.value}</small>
                    </div>
                  ))}
                </div>
              )
            : <div className={styles.paletteEmpty}>{active.paletteStatus}</div>}
          <div>
            <span className={styles.sectionLabel}>Tone and Atmosphere Guidance</span>
            <ul className={styles.cleanList}>
              {active.moodAdvice.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <ul className={styles.cleanList}>
            {active.visualDirection.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className={styles.suggestionSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>Revision Request</span>
              <h3>Revise {active.name} with Codex</h3>
            </div>
            <p>Local development only · submission modifies the project&apos;s story blueprint files</p>
          </div>
          <form className={styles.suggestionForm} onSubmit={submitSuggestion}>
            <label htmlFor={`batch-suggestion-${active.id}`}>
              Your revision notes
            </label>
            <textarea
              disabled={submission.state === 'running'}
              id={`batch-suggestion-${active.id}`}
              maxLength={4000}
              onChange={(event) => setSuggestion(event.target.value)}
              placeholder="Example: The priest did not collect the devices himself. An anonymous visitor entrusted them to him in 1967. Update the discovery record, content nodes, and related votes."
              rows={6}
              value={suggestion}
            />
            <div className={styles.suggestionActions}>
              <span>{suggestion.length} / 4000</span>
              <button
                className="btn-primary"
                disabled={submission.state === 'running' || suggestion.trim().length < 2}
                type="submit"
              >
                {submission.state === 'running' ? 'Codex is revising…' : 'Submit to Codex'}
              </button>
            </div>
          </form>
          {submission.state !== 'idle' && (
            <div
              aria-live="polite"
              className={styles.submissionStatus}
              data-state={submission.state}
            >
              <strong>
                {submission.state === 'running' && 'Revision in progress'}
                {submission.state === 'success' && 'Revision complete'}
                {submission.state === 'error' && 'Revision failed'}
              </strong>
              <p>{submission.message}</p>
              {submission.state === 'success' && (
                <button className="btn-secondary" onClick={() => window.location.reload()} type="button">
                  Refresh to view the latest version
                </button>
              )}
            </div>
          )}
        </section>

        <section className={styles.factGrid}>
          {FACT_GROUPS.map((group) => (
            <div className={styles.factCard} data-tone={group.tone} key={group.id}>
              <span className={styles.sectionLabel}>{group.label}</span>
              <ul>
                {active[group.id].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section className={styles.phaseSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>Release Path</span>
              <h3>From Discovery to Active Field Record</h3>
            </div>
            <p>Pack count, price, and dates are not yet fulfillment commitments</p>
          </div>
          <div className={styles.phaseGrid}>
            {active.phases.map((phase, index) => (
              <details className={styles.phaseCard} key={phase.label} open={index === 0}>
                <summary>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{phase.label}</strong>
                </summary>
                <div>
                  <p>{phase.objective}</p>
                  <ul>
                    {phase.contents.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.contentMapSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>Complete Content Map</span>
              <h3>Every known node planned from the beginning</h3>
            </div>
            <p>New evidence may change a node, but every published clue keeps a resolution point</p>
          </div>
          <div className={styles.contentMap}>
            {active.contentMap.map((node) => (
              <details className={styles.contentNode} key={node.code}>
                <summary>
                  <span>{node.code}</span>
                  <strong>{node.title}</strong>
                  <small>{node.phase} · {node.type}</small>
                </summary>
                <dl>
                  <div>
                    <dt>Audience</dt>
                    <dd>{node.audience}</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{node.purpose}</dd>
                  </div>
                  <div>
                    <dt>Member Action</dt>
                    <dd>{node.action}</dd>
                  </div>
                  <div>
                    <dt>Resolution Point</dt>
                    <dd>{node.recovery}</dd>
                  </div>
                </dl>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.voteSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>Vote Plan</span>
              <h3>What members decide and where the result appears</h3>
            </div>
            <p>These are first-draft options and may change as the evidence develops</p>
          </div>
          <div className={styles.voteGrid}>
            {active.votes.map((vote) => (
              <article className={styles.voteCard} key={vote.code}>
                <header>
                  <span>{vote.code}</span>
                  <h4>{vote.question}</h4>
                </header>
                <p><strong>Trigger</strong>{vote.trigger}</p>
                <ol>
                  {vote.options.map((option) => <li key={option}>{option}</li>)}
                </ol>
                <p><strong>Will Not Change</strong>{vote.fixed}</p>
                <p><strong>Result Appears In</strong>{vote.result}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.boundaryGrid}>
          <div>
            <span className={styles.sectionLabel}>Creative Boundaries</span>
            <h3>What this story must not become</h3>
            <ul className={styles.cleanList}>
              {active.avoid.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <span className={styles.sectionLabel}>Next Pass</span>
            <h3>Information to confirm first</h3>
            <ol className={styles.questionList}>
              {active.nextQuestions.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </div>
        </section>
      </article>
    </>
  )
}
