'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import posthog from 'posthog-js'
import { FlameSlider, WorldChoiceCards, WORLD_OPTIONS, beliefToReason } from '@/components/flame-slider'
import { submitApplication } from '@/lib/actions/applications'

/* ─── Types ──────────────────────────────────────── */
type Step = 'q1' | 'q2' | 'cta' | 'success'

/* ─── Root ───────────────────────────────────────── */
export default function HomePage() {
  return <Suspense><OnboardingInner /></Suspense>
}

function OnboardingInner() {
  const params   = useSearchParams()
  const initStep = (params.get('step') as Step) ?? 'q1'
  const [step, setStep]                   = useState<Step>(initStep)
  const [exiting, setExiting]             = useState(false)
  const [belief, setBelief]               = useState(0)
  const [beliefTouched, setBeliefTouched] = useState(false)
  const [emotion, setEmotion]             = useState('')
  const [email, setEmail]                 = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [showTransition, setShowTransition] = useState(false)

  /* ?preview resets flag; otherwise redirect to console if already registered */
  useEffect(() => {
    if (params.get('preview') !== null) {
      localStorage.removeItem('putopia_voyager_registered')
    } else if (localStorage.getItem('putopia_voyager_registered')) {
      window.location.replace('/console')
    }
  }, [params])

  useEffect(() => {
    if (params.get('preview') !== null) return
    if (!localStorage.getItem('putopia_voyager_registered')) {
      posthog.capture('onboarding_started')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Animated step transition */
  const goTo = useCallback((next: Step) => {
    setExiting(true)
    setTimeout(() => { setStep(next); setExiting(false) }, 300)
  }, [])

  const handleSlider = (v: number) => {
    setBelief(v)
    if (!beliefTouched) setBeliefTouched(true)
  }

  const handleQ2Select = (id: string) => {
    setEmotion(id)
    posthog.capture('onboarding_q2_completed', { world_selected: id })
    setTimeout(() => goTo('cta'), 380)   // brief pause so user sees selection highlight
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    // Submit to the shared applications table
    const worldText = WORLD_OPTIONS.find(w => w.id === emotion)?.text ?? emotion
    await submitApplication({
      email,
      reason:   beliefToReason(belief),
      location: worldText,
    })
    posthog.capture('onboarding_email_submitted', { belief_value: belief, world_selected: emotion })
    // Brief "TRANSMITTING..." beat before scan fires
    await new Promise(r => setTimeout(r, 200))
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead')
    }
    setShowTransition(true)
  }

  return (
    /* Full-screen overlay — covers sidebar + bottom-nav */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-deep-2)',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>

      {/* Scan transition fires after identity confirmation */}
      {showTransition && (
        <ScanTransition onComplete={() => {
          localStorage.setItem('putopia_voyager_registered', '1')
          window.location.href = '/console'
        }} />
      )}

      {step !== 'success' ? (
        /* Main content — centered, constrained width, fits in one screen */
        <div style={{
          width: '100%', maxWidth: 480,
          padding: '0 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.75rem',
        }}>
          {/* Video stays visible throughout the entire flow */}
          <VideoSection />

          {/* Single card area — one step at a time */}
          <div style={{ width: '100%' }}>
            <AnimatedCard key={step} exiting={exiting}>

              {step === 'q1' && (
                <Q1Card
                  value={belief}
                  onChange={handleSlider}
                  touched={beliefTouched}
                  onContinue={() => {
                    if (beliefTouched) {
                      posthog.capture('onboarding_q1_completed', { belief_value: belief })
                      goTo('q2')
                    }
                  }}
                />
              )}

              {step === 'q2' && (
                <Q2Card selected={emotion} onSelect={handleQ2Select} />
              )}

              {step === 'cta' && (
                <CtaCard
                  email={email}
                  setEmail={setEmail}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                />
              )}

            </AnimatedCard>
          </div>
        </div>
      ) : (
        <SuccessScreen />
      )}

    </div>
  )
}  // end OnboardingInner

/* ─────────────────────────────────────────────────────
   ANIMATED CARD WRAPPER
   key={step} forces remount on each transition.
   On mount: slides in from below.
   While exiting: slides up and fades out.
───────────────────────────────────────────────────── */
function AnimatedCard({ exiting, children }: { exiting: boolean; children: React.ReactNode }) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 16)
    return () => clearTimeout(t)
  }, [])

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
   VIDEO SECTION — retro-futuristic overlay stack
───────────────────────────────────────────────────── */
function VideoSection() {
  return (
    <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* ── Video ── */}
      <video
        src="/assets/device-reel.mp4"
        autoPlay muted loop playsInline
        style={{
          width: '100%', display: 'block',
          /* Base tone: slightly darker, punchier, cooler */
          filter: 'contrast(1.12) saturate(0.88) brightness(0.80)',
          animation: 'videoJitter 12s infinite',
        }}
      />

      {/* ── Layer 1: CRT Scanlines ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)',
      }} />

      {/* ── Layer 2: Vignette (dark corners) ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(5,8,22,0.72) 100%)',
      }} />

      {/* ── Layer 3: Cyan inset glow — screen edge bleed ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
        boxShadow: 'inset 0 0 35px rgba(34,212,224,0.07), inset 0 0 70px rgba(34,212,224,0.03)',
      }} />

      {/* ── Layer 4: Sweeping scan line ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 4 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(34,212,224,0.35) 30%, rgba(34,212,224,0.65) 50%, rgba(34,212,224,0.35) 70%, transparent 100%)',
          boxShadow: '0 0 8px rgba(34,212,224,0.4), 0 0 20px rgba(34,212,224,0.15)',
          animation: 'videoSweep 5s linear infinite',
        }} />
      </div>

      {/* ── Layer 5: Chromatic aberration — top (red shift) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '28%',
        pointerEvents: 'none', zIndex: 5,
        background: 'linear-gradient(180deg, rgba(255,30,60,0.07) 0%, transparent 100%)',
        mixBlendMode: 'screen',
      }} />

      {/* ── Layer 5b: Chromatic aberration — bottom (cyan shift) ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%',
        pointerEvents: 'none', zIndex: 5,
        background: 'linear-gradient(0deg, rgba(0,210,255,0.07) 0%, transparent 100%)',
        mixBlendMode: 'screen',
      }} />

      {/* ── Layer 6: Noise grain (SVG feTurbulence) ── */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6, opacity: 0.06 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="vg-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="overlay" />
        </filter>
        <rect width="100%" height="100%" filter="url(#vg-noise)" />
      </svg>

      {/* ── Layer 7: Flicker ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
        background: 'rgba(242,240,230,1)',
        animation: 'videoFlicker 8s infinite',
      }} />

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Q1 — FLAME SLIDER
───────────────────────────────────────────────────── */
function Q1Card({ value, onChange, touched, onContinue }: {
  value: number; onChange: (v: number) => void
  touched: boolean; onContinue: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.38em', color: 'var(--color-nucleus)', opacity: 0.65 }}>
          01 / 02
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          How strongly do you feel that another version of your life exists right now?
        </h2>
      </div>

      <FlameSlider value={value} onChange={onChange} />

      {/* Continue button — appears after first interaction */}
      <div style={{
        opacity: touched ? 1 : 0.22,
        transition: 'opacity 0.35s ease',
        pointerEvents: touched ? 'auto' : 'none',
      }}>
        <button
          onClick={onContinue}
          style={{
            background: touched ? 'rgba(255,90,31,0.08)' : 'transparent',
            border: `1px solid ${touched ? 'rgba(255,90,31,0.5)' : 'rgba(242,240,230,0.12)'}`,
            color: touched ? 'var(--color-star)' : 'var(--color-star-dim)',
            fontFamily: 'var(--font-display)', fontSize: '0.68rem', letterSpacing: '0.2em',
            padding: '0.75rem 1.5rem', cursor: touched ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
          onMouseEnter={e => {
            if (!touched) return
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255,90,31,0.13)'
            el.style.boxShadow  = '0 0 20px rgba(255,90,31,0.12)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255,90,31,0.08)'
            el.style.boxShadow  = 'none'
          }}
        >
          CONTINUE <span style={{ opacity: 0.6 }}>→</span>
        </button>
      </div>

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Q2 — WORLD CHOICE (uses shared WorldChoiceCards)
───────────────────────────────────────────────────── */
function Q2Card({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.38em', color: 'var(--color-nebula)', opacity: 0.65 }}>
          02 / 02
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          Which parallel world are you most hoping to find?
        </h2>
      </div>

      <WorldChoiceCards selected={selected} onSelect={onSelect} />

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   CTA CARD — affirmation first, then form staggered in
───────────────────────────────────────────────────── */
function CtaCard({ email, setEmail, submitting, onSubmit }: {
  email: string; setEmail: (v: string) => void
  submitting: boolean; onSubmit: (e: React.FormEvent) => void
}) {
  const [showSecondLine, setShowSecondLine] = useState(false)
  const [showForm, setShowForm]             = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t1 = setTimeout(() => setShowSecondLine(true), 700)
    const t2 = setTimeout(() => {
      setShowForm(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    }, 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Affirmation — staggered lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 700,
          fontSize: '1.35rem', lineHeight: 1.5,
          color: 'var(--color-star)', margin: 0,
          animation: 'fadeInUp 0.5s ease forwards',
        }}>
          Yes, it's you.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 500,
          fontSize: '1.05rem', lineHeight: 1.6,
          color: 'var(--color-star-dim)', margin: 0,
          opacity: showSecondLine ? 1 : 0,
          transform: showSecondLine ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}>
          You are the Voyager we've been looking for.
        </p>
      </div>

      {/* Invitation + form — fades in after affirmation */}
      <div style={{
        opacity: showForm ? 1 : 0,
        transform: showForm ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        pointerEvents: showForm ? 'auto' : 'none',
      }}>
        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,90,31,0.15)' }} />

        {/* Invitation text */}
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.92rem',
          color: 'rgba(242,240,230,0.55)', lineHeight: 1.75, margin: 0,
        }}>
          Leave your email below. We will invite you into our collective and assign you access to a Multiverse Console.
        </p>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
              letterSpacing: '0.3em', color: 'var(--color-star-deep)',
            }}>
              YOUR EMAIL
            </label>
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
          </div>

          {/* CTA button */}
          <button
            type="submit"
            disabled={!email || submitting}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background:  email && !submitting ? 'rgba(255,90,31,0.1)' : 'transparent',
              border:      `1px solid ${email && !submitting ? 'rgba(255,90,31,0.5)' : 'rgba(242,240,230,0.12)'}`,
              color:       email && !submitting ? 'var(--color-star)' : 'rgba(242,240,230,0.35)',
              fontFamily:  'var(--font-display)', fontSize: '0.72rem', letterSpacing: '0.15em',
              cursor:      email && !submitting ? 'pointer' : 'default',
              transition:  'all 0.2s ease',
              boxShadow:   email && !submitting ? '0 0 20px rgba(255,90,31,0.08)' : 'none',
              opacity:     submitting ? 0.55 : 1,
            }}
            onMouseEnter={e => {
              if (!email || submitting) return
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,90,31,0.16)'
              el.style.boxShadow  = '0 0 28px rgba(255,90,31,0.16)'
            }}
            onMouseLeave={e => {
              if (!email) return
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,90,31,0.1)'
              el.style.boxShadow  = '0 0 20px rgba(255,90,31,0.08)'
            }}
          >
            {submitting ? '> TRANSMITTING...' : 'CONFIRM MY VOYAGER IDENTITY'}
          </button>

        </form>
      </div>

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   SCAN TRANSITION — cyan beam sweeps top→bottom,
   revealing the Welcome page beneath. ~720 ms total.
   Audio: sine tone rises with the beam + chime on lock.
───────────────────────────────────────────────────── */
function ScanTransition({ onComplete }: { onComplete: () => void }) {
  const callbackRef = useRef(onComplete)
  callbackRef.current = onComplete
  const welcomeRef  = useRef<HTMLDivElement>(null)
  const beamRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const SWEEP_MS = 1050

    // ── Audio ──────────────────────────────────────────
    let ac: AudioContext | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ac = new (window.AudioContext ?? (window as any).webkitAudioContext)() as AudioContext
      const t = ac.currentTime

      // Rising tone — pitch climbs with the beam
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(420, t)
      osc.frequency.linearRampToValueAtTime(900, t + SWEEP_MS / 1000)
      const g = ac.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.08, t + 0.05)
      g.gain.setValueAtTime(0.08, t + (SWEEP_MS - 80) / 1000)
      g.gain.linearRampToValueAtTime(0, t + (SWEEP_MS + 60) / 1000)
      osc.connect(g); g.connect(ac.destination)
      osc.start(); osc.stop(t + (SWEEP_MS + 100) / 1000)

      // Lock chime — fires when beam hits bottom
      setTimeout(() => {
        if (!ac) return
        const t2 = ac.currentTime
        const ch = ac.createOscillator(); ch.type = 'sine'; ch.frequency.value = 1340
        const cg = ac.createGain()
        cg.gain.setValueAtTime(0.10, t2)
        cg.gain.exponentialRampToValueAtTime(0.001, t2 + 0.55)
        ch.connect(cg); cg.connect(ac.destination)
        ch.start(); ch.stop(t2 + 0.6)
      }, SWEEP_MS)
    } catch { /* non-critical */ }

    // ── Animation ──────────────────────────────────────
    const startMs = performance.now()
    let rafId: number

    function animate(now: number) {
      const linear   = Math.min((now - startMs) / SWEEP_MS, 1)
      // Ease-in-out quad — smooth acceleration through the middle
      const progress = linear < 0.5
        ? 2 * linear * linear
        : 1 - Math.pow(-2 * linear + 2, 2) / 2

      if (beamRef.current) {
        beamRef.current.style.top = `calc(${(progress * 100).toFixed(2)}% - 4px)`
      }
      if (welcomeRef.current) {
        welcomeRef.current.style.clipPath =
          `inset(0 0 ${((1 - progress) * 100).toFixed(2)}% 0)`
      }

      if (linear < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        setTimeout(() => callbackRef.current(), 320)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(rafId); ac?.close() }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>

      {/* Dim the current page */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,8,16,0.70)',
      }} />

      {/* Welcome destination — clips in beneath the beam */}
      <div
        ref={welcomeRef}
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--color-deep-2)',
          clipPath: 'inset(0 0 100% 0)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1.1rem', textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(34,212,224,0.75)' }}>
          WELCOME,
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', letterSpacing: '0.14em', color: 'var(--color-nucleus)', lineHeight: 1 }}>
          VOYAGER
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', color: 'rgba(242,240,230,0.4)', lineHeight: 1.8, marginTop: '0.25rem' }}>
          YOU HAVE BEEN SELECTED TO EXPLORE<br />
          THE MYSTERIES OF PARALLEL WORLDS.
        </div>
      </div>

      {/* Scan beam */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          ref={beamRef}
          style={{
            position: 'absolute', left: 0, right: 0, top: '-4px', height: 4,
            background: 'linear-gradient(90deg, transparent 0%, rgba(34,212,224,0.25) 10%, rgba(34,212,224,1) 50%, rgba(34,212,224,0.25) 90%, transparent 100%)',
            boxShadow: '0 0 24px rgba(34,212,224,1), 0 0 80px rgba(34,212,224,0.65), 0 0 160px rgba(34,212,224,0.25), 0 12px 60px rgba(34,212,224,0.18)',
          }}
        />
      </div>

      {/* CRT scanlines over everything */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
      }} />

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   SUCCESS — redirects to console after 3s
───────────────────────────────────────────────────── */
function SuccessScreen() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60)
    const t2 = setTimeout(() => { window.location.href = '/console' }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '4rem 2rem', textAlign: 'center', gap: '1.5rem',
      opacity: visible ? 1 : 0, transition: 'opacity 0.55s ease',
    }}>
      <div style={{
        width: 60, height: 60,
        border: '1px solid rgba(32,216,144,0.4)',
        background: 'rgba(32,216,144,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 28px rgba(32,216,144,0.14)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--color-ok)' }}>✓</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxWidth: 340 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.4em', color: 'var(--color-ok)' }}>
          COORDINATES RECEIVED
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.15em', color: 'var(--color-star)', margin: 0 }}>
          WELCOME, VOYAGER.
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'rgba(242,240,230,0.4)', lineHeight: 1.7, margin: 0 }}>
          Entering the collective now.
        </p>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.2em', color: 'rgba(242,240,230,0.18)' }}>
        Redirecting...
      </div>
    </div>
  )
}
