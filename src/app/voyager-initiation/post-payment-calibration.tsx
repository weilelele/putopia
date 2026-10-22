'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { VoyagerProfileQuiz, type VoyagerQuizServices } from '@/components/voyager-profile-quiz'
import { initiationAnalyticsProperties } from '@/lib/initiation-analytics'
import { hasConfirmedInitiationPayment, shouldInviteCalibration, type CalibrationSnapshot } from '@/lib/post-payment-calibration'
import { snoozeCalibrationReminder } from '@/lib/actions/calibration-reminder'
import { CALIBRATION_CHECK_EVENT } from '@/lib/calibration-reminder-client'
import styles from './post-payment-calibration.module.css'

const fixtureSnooze = async () => {}

/** Automatic invitations are claimed by the site-wide coordinator, never by a page. */
export function PostPaymentCalibration({ snapshot, quizServices, onAnalytics, showResume = false, environment = 'unknown', autoInvite = false, onSnooze }: {
  snapshot: CalibrationSnapshot
  quizServices?: VoyagerQuizServices
  onAnalytics?: (event: string, properties: Record<string, unknown>) => void
  showResume?: boolean
  environment?: string
  autoInvite?: boolean
  onSnooze?: () => Promise<void>
}) {
  const [stage, setStage] = useState<'idle' | 'quiz' | 'closed'>('idle')
  const [completed, setCompleted] = useState(false)
  const [started, setStarted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const invitationReported = useRef(false)
  const eligible = shouldInviteCalibration(snapshot)
  const inviteOpen = autoInvite && eligible && !completed && stage === 'idle'
  const saved = useCallback(() => setCompleted(true), [])
  const persistSnooze = onSnooze ?? (quizServices ? fixtureSnooze : snoozeCalibrationReminder)

  useEffect(() => {
    if (eligible && showResume && !autoInvite && !quizServices) window.dispatchEvent(new Event(CALIBRATION_CHECK_EVENT))
  }, [eligible, showResume, autoInvite, quizServices])

  function report(event: string, properties: Record<string, unknown> = {}) {
    const details = { ...initiationAnalyticsProperties(snapshot.purchaseKind ?? 'initial'), entry_point: 'post_payment', ...properties }
    try {
      if (onAnalytics) onAnalytics(event, details)
      else posthog.capture(event, { ...details, source: 'client', is_test: environment !== 'production', is_internal_qa: snapshot.role === 'architect' || environment === 'fixture' })
    } catch { /* Telemetry must never block onboarding. */ }
  }
  useEffect(() => {
    if (!inviteOpen || invitationReported.current) return
    invitationReported.current = true
    report('calibration_invitation_viewed')
    // One invitation event per mounted buyer; telemetry changes do not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteOpen])

  function later() {
    void persistSnooze().catch(() => {})
    setStage('closed')
    report('calibration_invitation_deferred')
  }
  function begin() {
    void persistSnooze().catch(() => {})
    setStage('quiz')
    report('calibration_opened')
  }
  function closeQuiz() {
    if (!completed) void persistSnooze().catch(() => {})
    report('calibration_closed', { started, completed })
    setStage('closed')
    setStarted(false)
    setDirty(false)
  }

  if (!hasConfirmedInitiationPayment(snapshot) || (!eligible && stage !== 'quiz')) return null
  return <>
    {showResume && !completed && <ArchiveButton fullWidth variant="secondary" onClick={begin}>SIGNAL CALIBRATION →</ArchiveButton>}
    <ArchiveSheet open={inviteOpen} onClose={later} title="Welcome, Voyager" footer={<div className="archive-sheet__actions">
      <ArchiveButton onClick={begin}>ALIGN →</ArchiveButton>
      <ArchiveButton variant="secondary" onClick={later}>LATER</ArchiveButton>
    </div>}>
      <p>Your place in the Collective is secured. Let your signal be heard.</p>
    </ArchiveSheet>
    <ArchiveSheet open={stage === 'quiz'} onClose={closeQuiz} title="Signal Calibration" size={started ? 'fullscreen' : 'wide'} headerless busy={busy} dirty={dirty} className={styles.quiz}>
      {stage === 'quiz' && <VoyagerProfileQuiz calibration services={quizServices} onAnalytics={report} onComplete={saved} onReturn={closeQuiz}
        onStart={() => setStarted(true)} onBusyChange={setBusy} onDirtyChange={setDirty} />}
    </ArchiveSheet>
  </>
}
