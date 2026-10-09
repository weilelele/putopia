'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getVoyagerIntake, saveVoyagerIntake } from '@/lib/actions/voyager-intake'
import { EMPTY_INTAKE, PROFILE_QUESTIONS, US_STATES, JAPAN_PREFECTURES, intakeStepError, type VoyagerIntake } from '@/lib/voyager-intake'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput, ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'

export type VoyagerQuizServices = {
  load: typeof getVoyagerIntake
  save: typeof saveVoyagerIntake
}
const defaultServices: VoyagerQuizServices = { load: getVoyagerIntake, save: saveVoyagerIntake }

export function VoyagerProfileQuiz({ calibration = false, onComplete, onReturn, onBusyChange, onDirtyChange, services = defaultServices }: {
  calibration?: boolean
  onComplete?: () => void
  onReturn?: () => void
  onBusyChange?: (busy: boolean) => void
  onDirtyChange?: (dirty: boolean) => void
  services?: VoyagerQuizServices
}) {
  const [step, setStep] = useState<'intro' | 'question' | 'result'>('intro')
  const [index, setIndex] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [answers, setAnswers] = useState<VoyagerIntake>({ ...EMPTY_INTAKE })
  const [checking, setChecking] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [worldId, setWorldId] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const questionHeading = useRef<HTMLHeadingElement>(null)

  const load = useCallback(async () => {
    setChecking(true)
    setLoadError(false)
    try {
      const state = await services.load()
      setUserId(state.userId)
      if (state.completed) { setStep('result'); onComplete?.() }
    } catch {
      setLoadError(true)
    } finally {
      setChecking(false)
    }
  }, [services, onComplete])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    if (step === 'question') questionHeading.current?.focus()
  }, [index, step])

  function update(patch: Partial<VoyagerIntake>) {
    onDirtyChange?.(true)
    setAnswers(previous => ({ ...previous, ...patch }))
    setError('')
  }

  async function next() {
    if (submittingRef.current) return
    const problem = intakeStepError(answers, index)
    if (problem) { setError(problem); return }
    const currentQuestion = PROFILE_QUESTIONS[index]
    if ('correctAnswer' in currentQuestion && !reviewing && (index === 0 ? answers.mission : answers.console) !== currentQuestion.correctAnswer) {
      setReviewing(true)
      return
    }
    if (index < 4) { setReviewing(false); setIndex(index + 1); return }
    submittingRef.current = true
    setSubmitting(true)
    onBusyChange?.(true)
    setError('')
    try {
      const result = await services.save(answers)
      if (!result.ok) { setError(result.error ?? 'Please try again.'); return }
      setWorldId(result.worldId ?? null)
      setStep('result')
      onDirtyChange?.(false)
      onComplete?.()
    } catch {
      setError('Your profile could not be saved. Your answers are still here; please try again.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      onBusyChange?.(false)
    }
  }

  if (calibration && checking) return <p role="status">Loading Signal Calibration…</p>
  if (calibration && loadError) return <div role="alert"><p>Your calibration status could not be loaded.</p><ArchiveButton onClick={load}>TRY AGAIN</ArchiveButton></div>
  if (checking) return <ArchiveRouteLoading label={calibration ? "LOADING SIGNAL CALIBRATION" : "LOADING VOYAGER PROFILE"} />
  if (loadError) return <ArchiveRouteError title="PROFILE UNAVAILABLE" description="Your Voyager profile could not be loaded. Please try again." onRetry={load} returnHref="/voyager-initiation" returnLabel="VOYAGER INITIATION" />

  const question = PROFILE_QUESTIONS[index]
  const selected = index === 0 ? answers.mission : answers.console
  const regions = answers.country === 'United States' ? US_STATES : JAPAN_PREFECTURES

  return (
    <div className={calibration ? "calibration-quiz" : "main pilot-archive-page archive-quiz-page"}>
      {!calibration && <div className="archive-quiz-nav">
        <ArchiveLinkButton href="/voyager-initiation" variant="ghost">← BACK</ArchiveLinkButton>
      </div>}
      <div className="archive-quiz-shell">
        {!userId ? (
          <ArchiveCard className="archive-quiz-state">
            <ArchivePageHeader title={calibration ? "SIGNAL" : "ESTABLISH YOUR"} accent={calibration ? "CALIBRATION" : "VOYAGER PROFILE"} />
            <p className="archive-page-intro">Log in to establish your Voyager profile and save your progress.</p>
            <ArchiveLinkButton href="/login?redirect=/voyager-initiation" variant="primary">LOG IN →</ArchiveLinkButton>
          </ArchiveCard>
        ) : step === 'intro' ? (
          <div className="archive-quiz-intro">
            <ArchivePageHeader title={calibration ? "SIGNAL" : "ESTABLISH YOUR"} accent={calibration ? "CALIBRATION" : "VOYAGER PROFILE"} />
            <p className="archive-page-intro">{calibration ? "Complete your calibration before joining." : "Discover our shared purpose and add your perspective to the Collective."}</p>
            <p className="archive-page-intro">5 questions</p>
            <ArchiveButton onClick={() => setStep('question')} variant="primary">{calibration ? "START CALIBRATION →" : "BEGIN MY PROFILE →"}</ArchiveButton>
          </div>
        ) : step === 'result' ? (
          <ArchiveCard className="archive-quiz-state">
            <ArchivePageHeader title={calibration ? "SIGNAL CALIBRATION" : "VOYAGER PROFILE"} accent={calibration ? "COMPLETE" : "ESTABLISHED"} />
            <p className="archive-page-intro">Your perspective is now part of the Collective.</p>
            {worldId && <p className="archive-page-intro">Your observation has been shared with the Parallax Array in London.</p>}
            {calibration && <p className="archive-page-intro">Calibration is saved. Initiation is confirmed only after payment.</p>}
            {calibration ? <ArchiveButton onClick={onReturn}>RETURN TO INITIATION →</ArchiveButton> : <a href="/voyager-initiation" className="archive-button archive-button--primary">RETURN TO INITIATION →</a>}
          </ArchiveCard>
        ) : (
          <form className="archive-quiz-question" onSubmit={event => { event.preventDefault(); void next() }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)' }}>{String(index + 1).padStart(2, '0')} / 05 — {question.label}</span>
              <div className="progress-track" role="progressbar" aria-label="Voyager profile progress" aria-valuemin={0} aria-valuemax={5} aria-valuenow={index + 1} style={{ flex: 1, minWidth: 32 }}>
                <div style={{ height: '100%', width: `${((index + 1) / 5) * 100}%`, background: 'var(--color-nucleus)' }} />
              </div>
            </div>
            <ArchiveCard className="archive-quiz-prompt">
              <h1 ref={questionHeading} tabIndex={-1} id="profile-question" style={{ margin: 0, fontSize: 'var(--fs-title)', lineHeight: 1.55 }}>{question.prompt}</h1>
            </ArchiveCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {'options' in question && <>
                {question.options.map((label, optionIndex) => {
                  const key = String.fromCharCode(97 + optionIndex)
                  const correct = reviewing && key === question.correctAnswer
                  if (reviewing && key !== selected && !correct) return null
                  return <ArchiveButton type="button" variant="secondary" key={key} aria-pressed={selected === key} className={`archive-quiz-option${selected === key ? ' is-selected' : ''}`} aria-disabled={reviewing} style={reviewing ? { opacity: 1, ...(correct ? { borderColor: 'var(--color-ok)', color: 'var(--color-ok)' } : {}) } : undefined} onClick={() => { if (!reviewing) update(index === 0 ? { mission: key } : { console: key }) }}>
                    <span className="archive-quiz-option__key" style={correct ? { borderColor: 'var(--color-ok)', color: 'var(--color-ok)' } : undefined}>{correct ? '✓' : key.toUpperCase()}</span>{label}{correct && <span className="sr-only"> — Correct answer</span>}
                  </ArchiveButton>
                })}
              </>}
              {index === 2 && <>
                <ArchiveField htmlFor="profile-country" label="Country">
                  <ArchiveSelect id="profile-country" value={answers.country} onChange={event => update({ country: event.target.value as VoyagerIntake['country'], region: '', otherCountry: '' })}>
                    <option>United States</option><option>Japan</option><option>Other</option>
                  </ArchiveSelect>
                </ArchiveField>
                {answers.country === 'Other' && <ArchiveField htmlFor="profile-other-country" label="Your country">
                  <ArchiveInput id="profile-other-country" autoComplete="country-name" maxLength={100} value={answers.otherCountry} onChange={event => update({ otherCountry: event.target.value })} />
                </ArchiveField>}
                <ArchiveField htmlFor="profile-region" label={answers.country === 'Japan' ? 'Prefecture' : 'State / Region'}>
                  {answers.country === 'Other' ? <ArchiveInput id="profile-region" autoComplete="address-level1" maxLength={100} value={answers.region} onChange={event => update({ region: event.target.value })} /> :
                    <ArchiveSelect id="profile-region" value={answers.region} onChange={event => update({ region: event.target.value })}>
                      <option value="">{answers.country === 'Japan' ? 'Select your prefecture.' : 'Select your state.'}</option>
                      {regions.map(region => <option key={region}>{region}</option>)}
                    </ArchiveSelect>}
                </ArchiveField>
              </>}
              {index === 3 && <ArchiveInput aria-labelledby="profile-question" placeholder="Your answer" maxLength={300} value={answers.work} onChange={event => update({ work: event.target.value })} />}
              {index === 4 && <>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 'var(--fs-body)', lineHeight: 1.5 }}>
                  <ArchiveInput type="checkbox" checked={answers.shareObservation} onChange={event => update({ shareObservation: event.target.checked })} disabled={submitting} />
                  Share this observation with the Parallax Array in London.
                </label>
                <ArchiveTextarea aria-labelledby="profile-question" placeholder="Your answer" rows={5} maxLength={2000} value={answers.observation} onChange={event => update({ observation: event.target.value })} disabled={submitting} />
              </>}
            </div>
            {error && <p role="alert" className="archive-page-intro">{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <ArchiveButton type="button" variant="secondary" disabled={submitting} onClick={() => { setError(''); setReviewing(false); if (index === 0) setStep('intro'); else setIndex(index - 1) }}>BACK</ArchiveButton>
              <ArchiveButton type="submit" variant="primary" disabled={submitting || !!intakeStepError(answers, index)}>{submitting ? 'SAVING…' : index === 4 ? (calibration ? 'COMPLETE CALIBRATION' : 'SAVE MY VOYAGER PROFILE') : 'NEXT →'}</ArchiveButton>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
