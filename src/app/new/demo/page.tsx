'use client'

/* ─────────────────────────────────────────────────────
   ONBOARDING DEMO  ·  /new/demo
   Self-contained preview of the reordered 3-question flow.
   - Does NOT write to the database or send any email.
   - Does NOT import submitApplication / posthog.
   - Reuses the shared WorldChoiceCards + HudField for fidelity;
     everything else is inlined so the live flow is untouched.

   Flow:  Q1 Console curiosity → Q2 World choice → Q3 Urgency slider → email
───────────────────────────────────────────────────── */

import { useState, useEffect, useRef, useCallback } from 'react'
import { WorldChoiceCards } from '@/components/flame-slider'
import { HudField } from '@/components/hud-field'

const VIDEO_SRC = '/assets/device-reel.mp4'

type Step = 'q1' | 'q2' | 'q3' | 'cta'

/* ── Q1: Multiverse Console curiosity ── */
const CONSOLE_OPTIONS = [
  { id: 'mechanism', text: 'How does it actually work?' },
  { id: 'worlds',    text: 'Which parallel worlds can it reach?' },
  { id: 'personal',  text: 'Can it show me worlds connected to my own?' },
  { id: 'access',    text: 'The tech, the price, and how to get one.' },
] as const

/* ── Q3: urgency slider copy (replaces old belief readings) ── */
const URGENCY_END_LABELS: Record<number, string> = { 0: 'Just curious', 5: "I'm ready now" }
const URGENCY_READINGS = [
  '',
  'A quiet curiosity.',
  'The pull begins.',
  'I want in.',
  'Barely able to wait.',
  'TAKE ME IN.',
]

export default function OnboardingDemoPage() {
  const [step, setStep]               = useState<Step>('q1')
  const [exiting, setExiting]         = useState(false)
  const [consoleId, setConsoleId]     = useState('')
  const [world, setWorld]             = useState('')
  const [urgency, setUrgency]         = useState(0)
  const [urgencyTouched, setUrgency2] = useState(false)
  const [email, setEmail]             = useState('')
  const [done, setDone]               = useState(false)

  const goTo = useCallback((next: Step) => {
    setExiting(true)
    setTimeout(() => { setStep(next); setExiting(false) }, 300)
  }, [])

  const handleConsole = (id: string) => {
    setConsoleId(id)
    setTimeout(() => goTo('q2'), 380)
  }

  const handleWorld = (id: string) => {
    setWorld(id)
    setTimeout(() => goTo('q3'), 380)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setDone(true)   // stubbed — no DB write, no email
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-deep-2)',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* DEMO banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001,
        textAlign: 'center', padding: '0.4rem',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em',
        color: 'var(--color-nebula)', background: 'rgba(200,68,6,0.08)',
        borderBottom: '1px solid rgba(200,68,6,0.25)',
      }}>
        DEMO — NO DATA IS SAVED
      </div>

      <div style={{
        width: '100%', maxWidth: 480,
        padding: '0 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1.75rem',
      }}>
        <VideoSection src={VIDEO_SRC} />

        <div style={{ width: '100%' }}>
          {done ? (
            <ConfirmStub email={email} />
          ) : (
            <AnimatedCard key={step} exiting={exiting}>

              {step === 'q1' && (
                <QuestionShell index="01 / 03" accent="var(--color-nucleus)"
                  headline="What do you most want to know about the Multiverse Console?">
                  <ChoiceCards options={CONSOLE_OPTIONS} selected={consoleId} onSelect={handleConsole} />
                </QuestionShell>
              )}

              {step === 'q2' && (
                <QuestionShell index="02 / 03" accent="var(--color-nebula)"
                  headline="Which world should the Console show you first?">
                  <WorldChoiceCards selected={world} onSelect={handleWorld} />
                </QuestionShell>
              )}

              {step === 'q3' && (
                <QuestionShell index="03 / 03" accent="var(--color-nucleus)"
                  headline="How urgently do you want to join the Collective and explore parallel worlds yourself?">
                  <UrgencySlider
                    value={urgency}
                    onChange={v => { setUrgency(v); if (!urgencyTouched) setUrgency2(true) }}
                  />
                  <ContinueButton touched={urgencyTouched} onClick={() => goTo('cta')} />
                </QuestionShell>
              )}

              {step === 'cta' && (
                <CtaStub email={email} setEmail={setEmail} onSubmit={handleSubmit} />
              )}

            </AnimatedCard>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   QUESTION SHELL — index label + headline + body
───────────────────────────────────────────────────── */
function QuestionShell({ index, accent, headline, children }: {
  index: string; accent: string; headline: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.38em', color: accent, opacity: 0.65 }}>
          {index}
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          {headline}
        </h2>
      </div>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   CHOICE CARDS — generic single-choice (Q1)
   Same visual language as WorldChoiceCards.
───────────────────────────────────────────────────── */
function ChoiceCards({ options, selected, onSelect }: {
  options: readonly { id: string; text: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {options.map(opt => {
        const isSelected = selected === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              background:  isSelected ? 'rgba(200,68,6,0.07)' : 'transparent',
              border:      `1px solid ${isSelected ? 'rgba(200,68,6,0.4)' : 'rgba(242,240,230,0.08)'}`,
              borderLeft:  `3px solid ${isSelected ? 'var(--color-nebula)' : 'transparent'}`,
              color:       isSelected ? 'var(--color-star)' : 'var(--color-star-dim)',
              fontFamily:  'var(--font-body)', fontSize: 'var(--fs-body)', fontWeight: 500,
              textAlign:   'left', padding: '1rem 1.1rem',
              cursor:      'pointer', lineHeight: 1.45,
              transition:  'all 0.15s ease',
            }}
            onMouseEnter={e => {
              if (isSelected) return
              const el = e.currentTarget as HTMLButtonElement
              el.style.background  = 'rgba(242,240,230,0.03)'
              el.style.borderColor = 'rgba(242,240,230,0.2)'
              el.style.color       = 'var(--color-star)'
            }}
            onMouseLeave={e => {
              if (isSelected) return
              const el = e.currentTarget as HTMLButtonElement
              el.style.background  = 'transparent'
              el.style.borderColor = 'rgba(242,240,230,0.08)'
              el.style.color       = 'var(--color-star-dim)'
            }}
          >
            {opt.text}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   URGENCY SLIDER — flame slider w/ corrected tick alignment
   Ticks + labels sit at value/5 positions, matching the thumb.
───────────────────────────────────────────────────── */
function UrgencySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pct = (value / 5) * 100

  const valueFromX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 5)
  }, [])

  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragging.current) onChange(valueFromX(e.clientX)) }
    const up   = () => { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
    }
  }, [onChange, valueFromX])

  const glowPx   = value > 0 ? 8 + value * 5 : 0
  const glowAlph = value > 0 ? 0.28 + value * 0.08 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Track */}
      <div
        onMouseDown={e => { dragging.current = true; onChange(valueFromX(e.clientX)) }}
        onTouchStart={e => { onChange(valueFromX(e.touches[0].clientX)) }}
        onTouchMove={e  => { onChange(valueFromX(e.touches[0].clientX)) }}
        style={{ padding: '10px 0', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}
      >
        <div ref={trackRef} style={{ position: 'relative', height: 10, background: 'rgba(26,31,43,0.9)' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
            background: 'linear-gradient(90deg, #6B1200, #C8401A, #E35205, #FF8C20, #FFB830)',
            boxShadow: `0 0 ${glowPx}px rgba(255,90,31,${glowAlph}), 0 0 ${glowPx * 2}px rgba(255,90,31,${glowAlph * 0.4})`,
            transition: 'width 0.08s ease, box-shadow 0.15s ease',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 22, height: 22, borderRadius: '50%',
            background: value > 0
              ? 'radial-gradient(circle at 38% 38%, #FFE0A0, #FF8C20, #E35205)'
              : 'rgba(36,41,56,0.95)',
            border: `1.5px solid ${value > 0 ? 'rgba(255,180,60,0.75)' : 'rgba(242,240,230,0.18)'}`,
            boxShadow: value > 0
              ? `0 0 ${6 + value * 3}px rgba(255,140,32,${0.4 + value * 0.08}), 0 0 ${12 + value * 5}px rgba(255,90,31,${0.2 + value * 0.05})`
              : 'none',
            transition: 'all 0.1s ease',
            pointerEvents: 'none', zIndex: 2,
          }} />
        </div>

        {/* Tick marks — absolutely positioned at value/5 to align with the thumb */}
        <div style={{ position: 'relative', height: 6, marginTop: '0.55rem' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} onClick={() => onChange(i)} style={{
              position: 'absolute', left: `${(i / 5) * 100}%`, transform: 'translateX(-50%)',
              width: 1, height: 4,
              background: i <= value && value > 0 ? `rgba(255,${140 - i * 8},32,0.75)` : 'rgba(242,240,230,0.12)',
              transition: 'background 0.12s', cursor: 'pointer',
            }} />
          ))}
        </div>
      </div>

      {/* End labels — pinned to the true extremes */}
      <div style={{ position: 'relative', height: '1.1rem' }}>
        <span style={{
          position: 'absolute', left: 0,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.05em',
          color: value === 0 ? 'rgba(242,240,230,0.6)' : 'rgba(242,240,230,0.3)',
        }}>
          {URGENCY_END_LABELS[0]}
        </span>
        <span style={{
          position: 'absolute', right: 0,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.05em',
          color: value === 5 ? 'rgba(255,135,32,0.85)' : 'rgba(242,240,230,0.3)',
        }}>
          {URGENCY_END_LABELS[5]}
        </span>
      </div>

      {/* Live reading */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em',
        color: 'rgba(255,140,32,0.65)', minHeight: '1.2rem',
        transition: 'opacity 0.25s ease', opacity: value > 0 ? 1 : 0,
      }}>
        {value > 0 && `${value} / 5 — ${URGENCY_READINGS[value]}`}
      </div>
    </div>
  )
}

/* ── CONTINUE button (appears after slider touched) ── */
function ContinueButton({ touched, onClick }: { touched: boolean; onClick: () => void }) {
  return (
    <div style={{
      opacity: touched ? 1 : 0.22,
      transition: 'opacity 0.35s ease',
      pointerEvents: touched ? 'auto' : 'none',
    }}>
      <button
        onClick={onClick}
        style={{
          background: touched ? 'rgba(255,90,31,0.08)' : 'transparent',
          border: `1px solid ${touched ? 'rgba(255,90,31,0.5)' : 'rgba(242,240,230,0.12)'}`,
          color: touched ? 'var(--color-star)' : 'var(--color-star-dim)',
          fontFamily: 'var(--font-display)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em',
          padding: '0.75rem 1.5rem', cursor: touched ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}
      >
        CONTINUE <span style={{ opacity: 0.6 }}>→</span>
      </button>
    </div>
  )
}

/* ── CTA STUB — email capture (no submit to backend) ── */
function CtaStub({ email, setEmail, onSubmit }: {
  email: string; setEmail: (v: string) => void; onSubmit: (e: React.FormEvent) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 300); return () => clearTimeout(t) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-title)', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          Yes, it&apos;s you.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 'var(--fs-body)', lineHeight: 1.6, color: 'var(--color-star-dim)', margin: 0 }}>
          You are the Voyager we&apos;ve been looking for.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ height: 1, background: 'rgba(255,90,31,0.15)' }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-body)', color: 'rgba(242,240,230,0.55)', lineHeight: 1.75, margin: 0 }}>
          Leave your email below to apply for your seat in our collective and secure your Multiverse Console.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: 'var(--color-star-deep)' }}>
              YOUR EMAIL
            </label>
            <HudField style={{ width: '100%' }}>
              <input
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operative@domain.void"
                className="input-dark"
                style={{ width: '100%' }}
              />
            </HudField>
          </div>

          <button
            type="submit"
            disabled={!email}
            style={{
              width: '100%', padding: '1rem 1.5rem',
              background:  email ? 'rgba(255,90,31,0.1)' : 'transparent',
              border:      `1px solid ${email ? 'rgba(255,90,31,0.5)' : 'rgba(242,240,230,0.12)'}`,
              color:       email ? 'var(--color-star)' : 'rgba(242,240,230,0.35)',
              fontFamily:  'var(--font-display)', fontSize: 'var(--fs-label)', letterSpacing: '0.15em',
              cursor:      email ? 'pointer' : 'default',
              transition:  'all 0.2s ease',
            }}
          >
            CONFIRM MY VOYAGER IDENTITY
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── CONFIRM STUB — shown after stubbed submit ── */
function ConfirmStub({ email }: { email: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '0.25rem 0' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.42em', color: 'var(--color-nebula)' }}>
        SIGNAL TRANSMITTED.
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-title)', lineHeight: 1.4, color: 'var(--color-star)' }}>
        Check your email inbox.
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'rgba(242,240,230,0.55)', lineHeight: 1.75 }}>
        Your key to the Collective<br />has been dispatched.
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(242,240,230,0.3)', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
        (demo: {email || '—'} — nothing was actually saved)
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ANIMATED CARD WRAPPER (copied from live flow)
───────────────────────────────────────────────────── */
function AnimatedCard({ exiting, children }: { exiting: boolean; children: React.ReactNode }) {
  const [entered, setEntered] = useState(false)
  useEffect(() => { const t = setTimeout(() => setEntered(true), 16); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      opacity:    exiting ? 0 : entered ? 1 : 0,
      transform:  exiting ? 'translateY(-16px)' : entered ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.28s ease, transform 0.28s ease',
    }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   VIDEO SECTION — trimmed from live flow (core CRT layers)
───────────────────────────────────────────────────── */
function VideoSection({ src }: { src: string }) {
  return (
    <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
      <video
        src={src}
        autoPlay muted loop playsInline
        style={{ width: '100%', display: 'block', filter: 'contrast(1.12) saturate(0.88) brightness(0.80)' }}
      />
      {/* CRT scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)',
      }} />
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(5,8,22,0.72) 100%)',
      }} />
      {/* Edge glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
        boxShadow: 'inset 0 0 35px rgba(200,68,6,0.07), inset 0 0 70px rgba(200,68,6,0.03)',
      }} />
    </div>
  )
}
