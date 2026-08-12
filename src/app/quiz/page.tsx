'use client'

import { useState, useEffect, useCallback } from 'react'
import { getApplicantTaskStatus } from '@/lib/actions/tasks'
import { getQuizQuestions, submitQuizAnswers } from '@/lib/actions/quiz'
import type { QuizQuestion } from '@/lib/actions/quiz'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'

const QUIZ_ID = 'applicant-baseline-v1'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'intro' | 'question' | 'result'
type Answers = Record<string, string>   // questionId (uuid) → selected option key

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckBigIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="8,16 13,22 24,10" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FailIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10l12 12M22 10L10 22" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" />
    </svg>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function AlreadyPassedScreen() {
  return (
    <ArchiveCard className="archive-quiz-state">
      <div style={{ marginBottom: 20, color: '#20D890', display: 'flex', justifyContent: 'center' }}>
        <CheckBigIcon />
      </div>
      <div style={{
        fontSize: 'var(--fs-h1)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        color: '#20D890', marginBottom: 10,
      }}>
        ALREADY COMPLETE
      </div>
      <p style={{ margin: '0 0 40px', fontSize: 'var(--fs-body)', color: 'rgba(245,245,245,0.4)', lineHeight: 1.65 }}>
        You have already passed the field assessment. Your results have been recorded.
      </p>
      <ArchiveLinkButton
        href="/console"
        variant="primary"
      >
        BACK TO DASHBOARD <ArrowIcon />
      </ArchiveLinkButton>
    </ArchiveCard>
  )
}

function IntroScreen({ onStart, questionCount }: { onStart: () => void; questionCount: number }) {
  return (
    <div className="archive-quiz-intro">
      <ArchivePageHeader title="FIELD" accent="ASSESSMENT" />
      <p className="archive-page-intro">
        Before you can be considered for Voyager status, you must demonstrate a baseline
        understanding of the Collective&apos;s mission and methods.
      </p>

      {/* Dynamic question count */}
      <div style={{ marginBottom: 36, fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.14em' }}>
        {questionCount > 0 ? `${questionCount} questions` : '…'}
      </div>

      <ArchiveButton
        onClick={onStart}
        variant="primary"
      >
        BEGIN ASSESSMENT <ArrowIcon />
      </ArchiveButton>
    </div>
  )
}

function QuestionScreen({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
  submitting,
}: {
  question: QuizQuestion
  index: number
  total: number
  selected: string | null
  onSelect: (key: string) => void
  onNext: () => void
  submitting?: boolean
}) {
  const isLast = index === total - 1

  return (
    <div className="archive-quiz-question">

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.15em' }}>
          QUESTION {index + 1} / {total}
        </span>
        <div className="progress-track" style={{ flex: 1 }}>
          <div style={{
            height: '100%', width: `${((index + 1) / total) * 100}%`,
            background: 'var(--color-nucleus)',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Question */}
      <ArchiveCard className="archive-quiz-prompt">
        <p style={{ margin: 0, fontSize: 'var(--fs-title)', color: '#F5F5F5', lineHeight: 1.55, letterSpacing: '0.01em' }}>
          {question.prompt}
        </p>
      </ArchiveCard>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {question.options.map((opt) => {
          const isSelected = selected === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              aria-pressed={isSelected}
              className={`archive-quiz-option${isSelected ? ' is-selected' : ''}`}
            >
              {/* Letter label */}
              <span className="archive-quiz-option__key">
                {opt.key.toUpperCase()}
              </span>
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Confirm */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ArchiveButton
          onClick={onNext}
          disabled={!selected || submitting}
          variant="primary"
        >
          {submitting ? 'SCORING…' : isLast ? 'SUBMIT' : 'NEXT'} {!submitting && <ArrowIcon />}
        </ArchiveButton>
      </div>
    </div>
  )
}

function ResultScreen({
  score,
  total,
  passed,
  passMark,
  onRetry,
}: {
  score: number
  total: number
  passed: boolean
  passMark: number
  onRetry: () => void
}) {
  return (
    <ArchiveCard className="archive-quiz-state">

      {/* Status icon */}
      <div style={{ marginBottom: 20, color: passed ? '#20D890' : '#E83030', display: 'flex', justifyContent: 'center' }}>
        {passed ? <CheckBigIcon /> : <FailIcon />}
      </div>

      {/* Verdict */}
      <div style={{
        fontSize: 'var(--fs-h1)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        color: passed ? '#20D890' : '#E83030', marginBottom: 10,
      }}>
        {passed ? 'PASSED' : 'FAILED'}
      </div>

      <div style={{ fontSize: 'var(--fs-title)', color: 'rgba(245,245,245,0.5)', marginBottom: 8, letterSpacing: '0.06em' }}>
        {score} / {total} correct
      </div>

      <p style={{ margin: '0 0 40px', fontSize: 'var(--fs-body)', color: 'rgba(245,245,245,0.4)', lineHeight: 1.65 }}>
        {passed
          ? 'Assessment complete. You have demonstrated the baseline understanding required for field operations. Return to your dashboard to continue.'
          : `You need ${passMark} correct answers to pass. Review the Collective's briefing materials and try again.`}
      </p>

      {/* Score breakdown bar */}
      <div className="archive-quiz-score">
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 28, height: 6,
              background: i < score
                ? (passed ? '#20D890' : 'rgba(232,48,48,0.7)')
                : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.1em' }}>
          PASS THRESHOLD — {passMark} / {total}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {passed ? (
          <ArchiveLinkButton
            href="/console"
            variant="primary"
          >
            BACK TO DASHBOARD <ArrowIcon />
          </ArchiveLinkButton>
        ) : (
          <>
            <ArchiveButton
              onClick={onRetry}
              variant="primary"
            >
              RETRY
            </ArchiveButton>
            <ArchiveLinkButton
              href="/intel"
              variant="secondary"
            >
              READ BRIEFINGS
            </ArchiveLinkButton>
          </>
        )}
      </div>
    </ArchiveCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const [step, setStep]             = useState<Step>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]       = useState<Answers>({})
  const [selected, setSelected]     = useState<string | null>(null)
  const [alreadyPassed, setAlreadyPassed] = useState(false)
  const [checking, setChecking]     = useState(true)
  const [questions, setQuestions]   = useState<QuizQuestion[]>([])
  const [loadError, setLoadError]   = useState(false)
  // Result from server-side scoring
  const [result, setResult]         = useState<{ score: number; total: number; passed: boolean; pass_mark: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadQuiz = useCallback(async () => {
    await Promise.resolve()
    setChecking(true)
    setLoadError(false)
    try {
      const [status, qs] = await Promise.all([
        getApplicantTaskStatus().catch(() => null),
        getQuizQuestions(QUIZ_ID),
      ])
      if (qs.length === 0) throw new Error('Quiz has no questions')
      if (status?.quiz) setAlreadyPassed(true)
      setQuestions(qs)
    } catch {
      setLoadError(true)
    } finally {
      setChecking(false)
    }
  }, [])

  // On mount: check already-passed + load questions in parallel
  useEffect(() => {
    void Promise.resolve().then(loadQuiz)
  }, [loadQuiz])

  const currentQuestion = questions[currentIdx]

  const handleStart = () => {
    setStep('question')
    setCurrentIdx(0)
    setAnswers({})
    setSelected(null)
    setResult(null)
  }

  const handleSelect = (key: string) => setSelected(key)

  const handleNext = () => {
    if (!selected || !currentQuestion) return

    const newAnswers = { ...answers, [currentQuestion.id]: selected }
    setAnswers(newAnswers)
    setSelected(null)

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      // Submit to server for scoring
      setSubmitting(true)
      submitQuizAnswers(newAnswers, QUIZ_ID)
        .then((res) => {
          setResult(res)
          setStep('result')
        })
        .finally(() => setSubmitting(false))
    }
  }

  const handleRetry = () => {
    setStep('intro')
    setCurrentIdx(0)
    setAnswers({})
    setSelected(null)
    setResult(null)
  }

  const score  = result?.score   ?? 0
  const passed = result?.passed  ?? false
  const total  = result?.total   ?? questions.length
  const passMark = result?.pass_mark ?? 4

  if (checking) {
    return <ArchiveRouteLoading label="LOADING FIELD ASSESSMENT" />
  }

  if (loadError) {
    return (
      <ArchiveRouteError
        title="ASSESSMENT UNAVAILABLE"
        description="The field assessment could not be loaded. Your previous result, if any, is unchanged."
        onRetry={loadQuiz}
        returnHref="/console"
        returnLabel="DASHBOARD"
      />
    )
  }

  return (
    <div className="main pilot-archive-page archive-quiz-page">
      <ArchiveBrandHeader />
      <div className="archive-quiz-nav">
        <span>FIELD ASSESSMENT</span>
        <ArchiveLinkButton href="/console" variant="ghost">← BACK</ArchiveLinkButton>
      </div>

      {/* ── Content ── */}
      <div className="archive-quiz-shell">
        {alreadyPassed && <AlreadyPassedScreen />}
        {!alreadyPassed && step === 'intro' && (
          <IntroScreen onStart={handleStart} questionCount={questions.length} />
        )}
        {!alreadyPassed && step === 'question' && currentQuestion && (
          <QuestionScreen
            question={currentQuestion}
            index={currentIdx}
            total={questions.length}
            selected={selected}
            onSelect={handleSelect}
            onNext={handleNext}
            submitting={submitting}
          />
        )}
        {!alreadyPassed && step === 'result' && result && (
          <ResultScreen score={score} total={total} passed={passed} passMark={passMark} onRetry={handleRetry} />
        )}
      </div>
    </div>
  )
}
