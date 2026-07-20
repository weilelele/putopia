'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SmartImage from '@/components/smart-image'
import { getApplicantTaskStatus } from '@/lib/actions/tasks'
import { getQuizQuestions, submitQuizAnswers } from '@/lib/actions/quiz'
import type { QuizQuestion } from '@/lib/actions/quiz'

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
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
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
      <Link
        href="/console"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 24px',
          background: 'linear-gradient(135deg, #20D890, #14A060)',
          color: '#0A0E27', fontSize: 'var(--fs-label)', letterSpacing: '0.12em',
          fontFamily: 'var(--font-mono)', textDecoration: 'none',
        }}
      >
        BACK TO DASHBOARD <ArrowIcon />
      </Link>
    </div>
  )
}

function IntroScreen({ onStart, questionCount }: { onStart: () => void; questionCount: number }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>

      <div style={{ marginBottom: 8, fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.2em' }}>{"// APPLICANT TASK 04 / 04"}</div>
      <h1 style={{ margin: '0 0 12px', fontSize: 'var(--fs-h2)', color: '#F5F5F5', letterSpacing: '0.04em' }}>
        FIELD ASSESSMENT
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: 'var(--fs-body)', color: 'rgba(245,245,245,0.5)', lineHeight: 1.7 }}>
        Before you can be considered for Voyager status, you must demonstrate a baseline
        understanding of the Collective&apos;s mission and methods.
      </p>

      {/* Dynamic question count */}
      <div style={{ marginBottom: 36, fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.14em' }}>
        {questionCount > 0 ? `${questionCount} questions` : '…'}
      </div>

      <button
        onClick={onStart}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 28px',
          background: 'linear-gradient(135deg, #FF6B35, #DC2F02)',
          border: 'none', cursor: 'pointer',
          color: '#F5F5F5', fontSize: 'var(--fs-label)', letterSpacing: '0.12em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        BEGIN ASSESSMENT <ArrowIcon />
      </button>
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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.15em' }}>
          QUESTION {index + 1} / {total}
        </span>
        <div style={{ flex: 1, height: 2, background: 'rgba(255,107,53,0.1)' }}>
          <div style={{
            height: '100%', width: `${((index + 1) / total) * 100}%`,
            background: 'linear-gradient(to right, #FF6B35, #E85D04)',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        marginBottom: 28, padding: '20px 22px',
        background: '#0F1430', border: '1px solid rgba(255,107,53,0.14)',
      }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-title)', color: '#F5F5F5', lineHeight: 1.55, letterSpacing: '0.01em' }}>
          {question.prompt}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {question.options.map((opt) => {
          const isSelected = selected === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', textAlign: 'left', cursor: 'pointer',
                background: isSelected ? 'rgba(255,107,53,0.1)' : '#0F1430',
                border: `1px solid ${isSelected ? 'rgba(255,107,53,0.55)' : 'rgba(255,107,53,0.12)'}`,
                color: isSelected ? '#FF6B35' : 'rgba(245,245,245,0.6)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
                letterSpacing: '0.03em', lineHeight: 1.5,
                transition: 'all 0.15s',
              }}
            >
              {/* Letter label */}
              <span style={{
                flexShrink: 0,
                width: 26, height: 26,
                border: `1px solid ${isSelected ? '#FF6B35' : 'rgba(255,107,53,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--fs-caption)', letterSpacing: '0.05em',
                color: isSelected ? '#FF6B35' : 'rgba(245,245,245,0.35)',
                background: isSelected ? 'rgba(255,107,53,0.12)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                {opt.key.toUpperCase()}
              </span>
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Confirm */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onNext}
          disabled={!selected || submitting}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 24px',
            background: selected && !submitting ? 'linear-gradient(135deg, #FF6B35, #DC2F02)' : 'rgba(255,107,53,0.06)',
            border: `1px solid ${selected && !submitting ? 'transparent' : 'rgba(255,107,53,0.14)'}`,
            color: selected && !submitting ? '#F5F5F5' : 'rgba(245,245,245,0.2)',
            fontSize: 'var(--fs-label)', letterSpacing: '0.12em',
            fontFamily: 'var(--font-mono)', cursor: selected && !submitting ? 'pointer' : 'default',
          }}
        >
          {submitting ? 'SCORING…' : isLast ? 'SUBMIT' : 'NEXT'} {!submitting && <ArrowIcon />}
        </button>
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
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '56px 24px', textAlign: 'center' }}>

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
      <div style={{
        margin: '0 auto 40px', maxWidth: 320,
        padding: '16px 20px', background: '#0F1430',
        border: `1px solid ${passed ? 'rgba(32,216,144,0.2)' : 'rgba(232,48,48,0.2)'}`,
      }}>
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
          <Link
            href="/console"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 24px',
              background: 'linear-gradient(135deg, #20D890, #14A060)',
              color: '#0A0E27', fontSize: 'var(--fs-label)', letterSpacing: '0.12em',
              fontFamily: 'var(--font-mono)', textDecoration: 'none',
            }}
          >
            BACK TO DASHBOARD <ArrowIcon />
          </Link>
        ) : (
          <>
            <button
              onClick={onRetry}
              style={{
                padding: '11px 24px',
                background: 'rgba(255,107,53,0.08)',
                border: '1px solid rgba(255,107,53,0.25)',
                color: '#FF6B35', fontSize: 'var(--fs-label)', letterSpacing: '0.12em',
                fontFamily: 'var(--font-mono)', cursor: 'pointer',
              }}
            >
              RETRY
            </button>
            <Link
              href="/intel"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '11px 24px',
                background: 'transparent',
                border: '1px solid rgba(255,107,53,0.14)',
                color: 'rgba(245,245,245,0.4)', fontSize: 'var(--fs-label)', letterSpacing: '0.12em',
                fontFamily: 'var(--font-mono)', textDecoration: 'none',
              }}
            >
              READ BRIEFINGS
            </Link>
          </>
        )}
      </div>
    </div>
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
  // Result from server-side scoring
  const [result, setResult]         = useState<{ score: number; total: number; passed: boolean; pass_mark: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // On mount: check already-passed + load questions in parallel
  useEffect(() => {
    Promise.all([
      getApplicantTaskStatus().catch(() => null),
      getQuizQuestions(QUIZ_ID),
    ]).then(([status, qs]) => {
      if (status?.quiz) setAlreadyPassed(true)
      setQuestions(qs)
      setChecking(false)
    })
  }, [])

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
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-deep)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.2em' }}>
          LOADING...
        </span>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}>

      {/* ── Top bar ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,107,53,0.12)',
        background: '#0F1430',
        padding: '12px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SmartImage src="/assets/vi-wordmark.png" alt="Multiverse Collective"
            sizes="73px" width={73} height={20} preload
            style={{ height: 20, width: 'auto', display: 'block' }} />
          <div style={{ width: 1, height: 13, background: 'rgba(255,107,53,0.22)' }} />
          <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', letterSpacing: '0.2em' }}>
            FIELD ASSESSMENT
          </span>
        </div>
        <Link
          href="/console"
          style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.12em', textDecoration: 'none' }}
        >
          ← BACK
        </Link>
      </div>

      {/* ── Content ── */}
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

      {/* ── Quiz ID watermark ── */}
      <div style={{ textAlign: 'center', paddingBottom: 24 }}>
        <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.1)', letterSpacing: '0.15em' }}>
          {QUIZ_ID}
        </span>
      </div>
    </div>
  )
}
