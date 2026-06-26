'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import posthog from 'posthog-js'
import { getFirstTouch } from '@/lib/utm'
import { resolveVariant, type ResolvedVariant } from '@/lib/onboarding-variants'
import type { OnboardingVariantRow } from '@/types/database'
import { FlameSlider, WorldChoiceCards, ConsoleChoiceCards, WORLD_OPTIONS, URGENCY_READINGS, URGENCY_END_LABELS, urgencyToReason } from '@/components/flame-slider'
import { submitApplication } from '@/lib/actions/applications'
import { HudField } from '@/components/hud-field'

/* ─── Onboarding Version ─────────────────────────── */
const ONBOARDING_VERSION = 'v3'

/* ─── Email Providers ────────────────────────────── */
const EMAIL_PROVIDERS: Record<string, { name: string; url: string }> = {
  'gmail.com':      { name: 'Gmail',        url: 'https://mail.google.com/mail/' },
  'googlemail.com': { name: 'Gmail',        url: 'https://mail.google.com/mail/' },
  'outlook.com':    { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'hotmail.com':    { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'live.com':       { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'msn.com':        { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'yahoo.com':      { name: 'Yahoo Mail',   url: 'https://mail.yahoo.com/' },
  'ymail.com':      { name: 'Yahoo Mail',   url: 'https://mail.yahoo.com/' },
  'icloud.com':     { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'me.com':         { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'mac.com':        { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'qq.com':         { name: 'QQ 邮箱',      url: 'https://mail.qq.com/' },
  'foxmail.com':    { name: 'Foxmail',      url: 'https://mail.qq.com/' },
  '163.com':        { name: '网易邮箱',     url: 'https://mail.163.com/' },
  '126.com':        { name: '网易邮箱',     url: 'https://mail.126.com/' },
  'yeah.net':       { name: '网易邮箱',     url: 'https://mail.yeah.net/' },
  'proton.me':      { name: 'Proton Mail',  url: 'https://mail.proton.me/' },
  'protonmail.com': { name: 'Proton Mail',  url: 'https://mail.proton.me/' },
}

function getEmailProvider(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? (EMAIL_PROVIDERS[domain] ?? null) : null
}

/* ─── Types ──────────────────────────────────────── */
/* Flow order: q1 Console curiosity → q2 world choice → q3 join-urgency → cta */
type Step = 'q1' | 'q2' | 'q3' | 'cta' | 'success'

/* ─── Root ───────────────────────────────────────── */
export default function OnboardingClient({ variants }: { variants: OnboardingVariantRow[] }) {
  return <Suspense><OnboardingInner variants={variants} /></Suspense>
}

function OnboardingInner({ variants }: { variants: OnboardingVariantRow[] }) {
  const params   = useSearchParams()
  const initStep = (params.get('step') as Step) ?? 'q1'
  const [step, setStep]                   = useState<Step>(initStep)
  const [exiting, setExiting]             = useState(false)
  const [consoleInterest, setConsoleInterest] = useState('')
  const [urgency, setUrgency]             = useState(0)
  const [urgencyTouched, setUrgencyTouched] = useState(false)
  const [emotion, setEmotion]             = useState('')
  const [email, setEmail]                 = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState('')
  const [showTransition, setShowTransition] = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [awaitClick, setAwaitClick]       = useState(false)
  const [pendingEmail, setPendingEmail]   = useState<string | null>(null)

  /* ── UTM-driven content variant ──
     Resolved from first-touch utm_content (ad group), with ?variant= override
     for QA. Safe to read getFirstTouch() at render: useSearchParams puts this
     component behind Suspense, so it is client-rendered only (no SSR/hydration
     mismatch). Unknown / missing UTM falls back to the default row's copy. */
  const v: ResolvedVariant = useMemo(
    () => resolveVariant(variants, { utmContent: getFirstTouch().utm_content, override: params.get('variant') }),
    [variants, params],
  )

  /* ?preview resets flags; otherwise check registered → console, or pending → inbox screen */
  useEffect(() => {
    if (params.get('preview') !== null) {
      localStorage.removeItem('putopia_voyager_registered')
      localStorage.removeItem('putopia_pending_email')
      return
    }
    const pending = localStorage.getItem('putopia_pending_email')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates state from localStorage / query params on mount
    if (pending) setPendingEmail(pending)
  }, [params])

  useEffect(() => {
    if (params.get('preview') !== null) return
    if (!localStorage.getItem('putopia_voyager_registered')) {
      const utm = getFirstTouch()
      posthog.capture('onboarding_started', {
        utm_source:        utm.utm_source   ?? undefined,
        utm_medium:        utm.utm_medium   ?? undefined,
        utm_campaign:      utm.utm_campaign ?? undefined,
        utm_content:       utm.utm_content  ?? undefined,
        fbclid:            utm.fbclid       ?? undefined,
        onboarding_version: ONBOARDING_VERSION,
        onboarding_variant: resolveVariant(variants, { utmContent: utm.utm_content, override: params.get('variant') }).key,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Which clip the current step shows (resolver already filled the inherit chain) */
  const stepVideo = step === 'cta' ? v.videoCta : (step === 'q2' || step === 'q3') ? v.videoQ2 : v.videoQ1

  /* Animated step transition */
  const goTo = useCallback((next: Step) => {
    setExiting(true)
    setTimeout(() => { setStep(next); setExiting(false) }, 300)
  }, [])

  /* Q1 — Multiverse Console curiosity (auto-advances) */
  const handleConsoleSelect = (id: string) => {
    setConsoleInterest(id)
    posthog.capture('onboarding_q1_completed', { console_interest: id, onboarding_version: ONBOARDING_VERSION })
    setTimeout(() => goTo('q2'), 380)
  }

  /* Q2 — world choice (auto-advances) */
  const handleWorldSelect = (id: string) => {
    setEmotion(id)
    posthog.capture('onboarding_q2_completed', { world_selected: id, onboarding_version: ONBOARDING_VERSION })
    setTimeout(() => goTo('q3'), 380)   // brief pause so user sees selection highlight
  }

  /* Q3 — join-urgency slider */
  const handleSlider = (val: number) => {
    if (!urgencyTouched) {
      posthog.capture('onboarding_slider_touched', { initial_value: val, onboarding_version: ONBOARDING_VERSION })
    }
    setUrgency(val)
    if (!urgencyTouched) setUrgencyTouched(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setSubmitError('')
    // Submit to the shared applications table
    const worldText = WORLD_OPTIONS.find(w => w.id === emotion)?.text ?? emotion
    const utm = getFirstTouch()
    const sp  = new URLSearchParams(window.location.search)
    const normalizedEmail = email.trim().toLowerCase()
    const result = await submitApplication({
      email:                normalizedEmail,
      reason:               urgencyToReason(urgency),
      location:             worldText,
      console_interest:     consoleInterest || null,
      join_urgency:         urgency,
      utm_source:           utm.utm_source,
      utm_medium:           utm.utm_medium,
      utm_campaign:         utm.utm_campaign,
      utm_content:          utm.utm_content,
      fbclid:               utm.fbclid,
      landing_page_variant: v.key !== 'default' ? v.key : (sp.get('variant') ?? null),
    })
    if (result.error && !result.applicationSaved) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }
    posthog.capture('waitlist_submitted', {
      utm_source:   utm.utm_source   ?? undefined,
      utm_medium:   utm.utm_medium   ?? undefined,
      utm_campaign: utm.utm_campaign ?? undefined,
      utm_content:  utm.utm_content  ?? undefined,
      fbclid:       utm.fbclid       ?? undefined,
      console_interest: consoleInterest,
      world_selected: emotion,
      urgency_value: urgency,
      onboarding_version: ONBOARDING_VERSION,
      onboarding_variant: v.key,
    })
    // Brief "TRANSMITTING..." beat before confirm screen appears
    await new Promise(r => setTimeout(r, 200))
    const w = window as typeof window & {
      fbq?: (...args: unknown[]) => void
      twq?: (...args: unknown[]) => void
    }
    if (typeof window !== 'undefined' && w.fbq) {
      w.fbq('track', 'Lead')
    }
    if (typeof window !== 'undefined' && w.twq) {
      w.twq('event', 'tw-rd22u-rd2mg', {})
    }
    if (result.error) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }
    // Persist email so returning users skip onboarding and land on the inbox screen
    localStorage.setItem('putopia_pending_email', normalizedEmail)
    setShowConfirm(true)
    // Enable click-anywhere to trigger scan after all lines have appeared
    setTimeout(() => setAwaitClick(true), 2400)
    // Auto-advance into the console after a beat so the user doesn't have to tap
    // (the click-anywhere overlay still lets the impatient skip ahead).
    setTimeout(() => {
      localStorage.setItem('putopia_voyager_registered', '1')
      window.location.href = '/console'
    }, 3500)
  }

  /* ── Returning user: already submitted email, hasn't completed /register ── */
  if (pendingEmail) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--color-deep-2)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <VideoSection key={v.videoCta} src={v.videoCta} />
          <PendingInboxScreen
            email={pendingEmail}
            onStartOver={() => {
              localStorage.removeItem('putopia_pending_email')
              setPendingEmail(null)
            }}
            onEnter={() => {
              localStorage.setItem('putopia_voyager_registered', '1')
              window.location.href = '/console'
            }}
          />
        </div>
      </div>
    )
  }

  return (
    /* Full-screen overlay — covers sidebar + bottom-nav */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--color-deep-2)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Transparent click-capture layer — guaranteed full-screen when awaiting tap */}
      {awaitClick && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99998, cursor: 'pointer' }}
          onClick={() => {
            setAwaitClick(false)
            localStorage.setItem('putopia_voyager_registered', '1')
            window.location.href = '/console'
          }}
        />
      )}

      {step !== 'success' ? (
        /* Main content — centered, constrained width, fits in one screen */
        <div style={{
          width: '100%', maxWidth: 480,
          padding: '0 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.75rem',
        }}>
          {/* Video stays visible throughout the flow. Each step shows its own clip;
              an inherited (identical) src keeps the same element mounted so it
              plays seamlessly, while a changed src remounts and swaps the clip. */}
          <VideoSection key={stepVideo} src={stepVideo} />

          {/* Single card area — one step at a time */}
          <div style={{ width: '100%' }}>
            <AnimatedCard key={step} exiting={exiting}>

              {step === 'q1' && (
                <ConsoleCard headline={v.consoleHeadline} selected={consoleInterest} onSelect={handleConsoleSelect} />
              )}

              {step === 'q2' && (
                <WorldCard headline={v.q2Headline} selected={emotion} onSelect={handleWorldSelect} />
              )}

              {step === 'q3' && (
                <UrgencyCard
                  headline={v.q1Headline}
                  value={urgency}
                  onChange={handleSlider}
                  touched={urgencyTouched}
                  onContinue={() => {
                    if (urgencyTouched) {
                      posthog.capture('onboarding_q3_completed', { urgency_value: urgency, onboarding_version: ONBOARDING_VERSION })
                      goTo('cta')
                    }
                  }}
                />
              )}

              {step === 'cta' && (
                <CtaCard
                  email={email}
                  setEmail={setEmail}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                  showConfirm={showConfirm}
                  awaitClick={awaitClick}
                  affirmLine1={v.affirmLine1}
                  affirmLine2={v.affirmLine2}
                  invitation={v.ctaInvitation}
                  ctaLabel={v.ctaLabel}
                  submitError={submitError}
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
function VideoSection({ src }: { src: string }) {
  return (
    <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* ── Video ── */}
      <video
        src={src}
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
        boxShadow: 'inset 0 0 35px rgba(232,93,4,0.07), inset 0 0 70px rgba(232,93,4,0.03)',
      }} />

      {/* ── Layer 4: Sweeping scan line ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 4 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(232,93,4,0.35) 30%, rgba(232,93,4,0.65) 50%, rgba(232,93,4,0.35) 70%, transparent 100%)',
          boxShadow: '0 0 8px rgba(232,93,4,0.4), 0 0 20px rgba(232,93,4,0.15)',
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
   Q1 — MULTIVERSE CONSOLE CURIOSITY (auto-advancing cards)
───────────────────────────────────────────────────── */
function ConsoleCard({ headline, selected, onSelect }: { headline: string; selected: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.38em', color: 'var(--color-nucleus)', opacity: 0.65 }}>
          01 / 03
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          {headline}
        </h2>
      </div>

      <ConsoleChoiceCards selected={selected} onSelect={onSelect} />

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Q3 — JOIN-URGENCY FLAME SLIDER
───────────────────────────────────────────────────── */
function UrgencyCard({ headline, value, onChange, touched, onContinue }: {
  headline: string
  value: number; onChange: (v: number) => void
  touched: boolean; onContinue: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.38em', color: 'var(--color-nucleus)', opacity: 0.65 }}>
          03 / 03
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          {headline}
        </h2>
      </div>

      <FlameSlider value={value} onChange={onChange} readings={URGENCY_READINGS} endLabels={URGENCY_END_LABELS} />

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
            fontFamily: 'var(--font-display)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em',
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
function WorldCard({ headline, selected, onSelect }: { headline: string; selected: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.38em', color: 'var(--color-nebula)', opacity: 0.65 }}>
          02 / 03
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', lineHeight: 1.5, color: 'var(--color-star)', margin: 0 }}>
          {headline}
        </h2>
      </div>

      <WorldChoiceCards selected={selected} onSelect={onSelect} />

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   CTA CARD — affirmation first, then form staggered in
───────────────────────────────────────────────────── */
function CtaCard({ email, setEmail, submitting, onSubmit, showConfirm, awaitClick, affirmLine1, affirmLine2, invitation, ctaLabel, submitError }: {
  email: string; setEmail: (v: string) => void
  submitting: boolean; onSubmit: (e: React.FormEvent) => void
  showConfirm: boolean; awaitClick: boolean
  affirmLine1: string; affirmLine2: string; invitation: string; ctaLabel: string
  submitError: string
}) {
  const [showSecondLine, setShowSecondLine] = useState(false)
  const [showForm, setShowForm]             = useState(false)
  const [confirmLines, setConfirmLines]     = useState([false, false, false, false, false])
  const inputRef = useRef<HTMLInputElement>(null)
  const provider = email ? getEmailProvider(email) : null

  useEffect(() => {
    const t1 = setTimeout(() => setShowSecondLine(true), 700)
    const t2 = setTimeout(() => {
      setShowForm(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    }, 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Stagger confirm lines in when showConfirm flips true
  useEffect(() => {
    if (!showConfirm) return
    const delays = [0, 550, 1100, 1750, 2100]
    const timers = delays.map((d, i) =>
      setTimeout(() => setConfirmLines(prev => {
        const next = [...prev]; next[i] = true; return next
      }), d)
    )
    return () => timers.forEach(clearTimeout)
  }, [showConfirm])

  const lineStyle = (visible: boolean): React.CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>

      {/* Affirmation — staggered lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 700,
          fontSize: 'var(--fs-title)', lineHeight: 1.5,
          color: 'var(--color-star)', margin: 0,
          animation: 'fadeInUp 0.5s ease forwards',
        }}>
          {affirmLine1}
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 500,
          fontSize: 'var(--fs-body)', lineHeight: 1.6,
          color: 'var(--color-star-dim)', margin: 0,
          opacity: showSecondLine ? 1 : 0,
          transform: showSecondLine ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}>
          {affirmLine2}
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
          fontFamily: 'var(--font-body)', fontSize: 'var(--fs-body)',
          color: 'rgba(242,240,230,0.55)', lineHeight: 1.75, margin: 0,
        }}>
          {invitation}
        </p>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
              letterSpacing: '0.3em', color: 'var(--color-star-deep)',
            }}>
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

          {submitError && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-caption)',
              color: 'var(--color-fault)',
              border: '1px solid rgba(232,48,48,0.3)',
              background: 'rgba(232,48,48,0.08)',
              padding: '0.7rem 0.8rem',
              lineHeight: 1.5,
            }}>
              {submitError}
            </div>
          )}

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
              fontFamily:  'var(--font-display)', fontSize: 'var(--fs-label)', letterSpacing: '0.15em',
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
            {submitting ? '> TRANSMITTING...' : ctaLabel}
          </button>

        </form>
      </div>

      {/* ── Inbox confirm overlay — slides in over the form ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--color-deep-2)',
        display: 'flex', flexDirection: 'column', gap: '1.1rem',
        justifyContent: 'center',
        padding: '0.25rem 0',
        opacity:    showConfirm ? 1 : 0,
        pointerEvents: showConfirm ? 'none' : 'none', // click passes through to wrapper
        transition: 'opacity 0.35s ease',
      }}>
        {/* SIGNAL TRANSMITTED. */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.42em', color: 'var(--color-nebula)',
          ...lineStyle(confirmLines[0]),
        }}>
          SIGNAL TRANSMITTED.
        </div>

        {/* Check your email inbox. */}
        <div style={{
          fontFamily: 'var(--font-body)', fontWeight: 700,
          fontSize: 'var(--fs-title)', lineHeight: 1.4, color: 'var(--color-star)',
          ...lineStyle(confirmLines[1]),
        }}>
          Check your email inbox.
        </div>

        {/* Body */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
          color: 'rgba(242,240,230,0.55)', lineHeight: 1.75,
          ...lineStyle(confirmLines[2]),
        }}>
          Your key to the Collective<br />has been dispatched.
        </div>

        {/* Tap hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.18em', color: 'rgba(232,93,4,0.6)',
          marginTop: '0.5rem',
          ...lineStyle(confirmLines[3]),
        }}>
          <span style={{ width: 18, height: 1, background: 'rgba(232,93,4,0.4)', display: 'inline-block', flexShrink: 0 }} />
          Tap to enter the inner sanctum.
          <span style={{
            display: 'inline-block', width: 7, height: '1em',
            background: 'var(--color-nebula)', verticalAlign: 'middle',
            marginLeft: 3, opacity: awaitClick ? 0.7 : 0,
            animation: awaitClick ? 'cursorBlink 1.1s step-end infinite' : 'none',
          }} />
        </div>

        {/* Email provider shortcut */}
        {provider && (
          <div style={{ ...lineStyle(confirmLines[4]), pointerEvents: 'auto' }}>
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                letterSpacing: '0.14em', color: 'var(--color-star)',
                border: '1px solid rgba(242,240,230,0.15)',
                padding: '0.55rem 1rem',
                background: 'rgba(242,240,230,0.04)',
                textDecoration: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(242,240,230,0.35)'
                el.style.background  = 'rgba(242,240,230,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(242,240,230,0.15)'
                el.style.background  = 'rgba(242,240,230,0.04)'
              }}
            >
              Open {provider.name} <span style={{ opacity: 0.5 }}>↗</span>
            </a>
          </div>
        )}
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
  // eslint-disable-next-line react-hooks/refs -- latest-ref pattern: keep the callback current without re-running the timer effect
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
        setTimeout(() => callbackRef.current(), 1800)
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
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.4em', color: 'rgba(232,93,4,0.75)' }}>
          WELCOME,
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-display)', letterSpacing: '0.14em', color: 'var(--color-nucleus)', lineHeight: 1 }}>
          VOYAGER
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'rgba(242,240,230,0.4)', lineHeight: 1.8, marginTop: '0.25rem' }}>
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
            background: 'linear-gradient(90deg, transparent 0%, rgba(232,93,4,0.25) 10%, rgba(232,93,4,1) 50%, rgba(232,93,4,0.25) 90%, transparent 100%)',
            boxShadow: '0 0 24px rgba(232,93,4,1), 0 0 80px rgba(232,93,4,0.65), 0 0 160px rgba(232,93,4,0.25), 0 12px 60px rgba(232,93,4,0.18)',
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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-h3)', color: 'var(--color-ok)' }}>✓</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxWidth: 340 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.4em', color: 'var(--color-ok)' }}>
          COORDINATES RECEIVED
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-body)', letterSpacing: '0.15em', color: 'var(--color-star)', margin: 0 }}>
          WELCOME, VOYAGER.
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(242,240,230,0.4)', lineHeight: 1.7, margin: 0 }}>
          Entering the collective now.
        </p>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'rgba(242,240,230,0.18)' }}>
        Redirecting...
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   PENDING INBOX SCREEN
   Shown when user returns to / after submitting email
   but before completing /register.
───────────────────────────────────────────────────── */
function PendingInboxScreen({
  email,
  onStartOver,
  onEnter,
}: {
  email: string
  onStartOver: () => void
  onEnter: () => void
}) {
  const [visible, setVisible] = useState(false)
  const provider = getEmailProvider(email)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const fadeIn: React.CSSProperties = {
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '1.5rem',
      ...fadeIn,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.42em', color: 'var(--color-nebula)',
        }}>
          SIGNAL TRANSMITTED.
        </div>
        <h2 style={{
          fontFamily: 'var(--font-body)', fontWeight: 700,
          fontSize: 'var(--fs-title)', lineHeight: 1.4,
          color: 'var(--color-star)', margin: 0,
        }}>
          Check your inbox.
        </h2>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          color: 'rgba(242,240,230,0.45)', lineHeight: 1.75, margin: 0,
        }}>
          Your activation key has been dispatched to:
        </p>
        {/* Email pill + provider button — same row, same height */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
            color: 'var(--color-star)',
            border: '1px solid rgba(232,93,4,0.25)',
            background: 'rgba(232,93,4,0.05)',
            padding: '0.4rem 0.8rem',
            letterSpacing: '0.04em',
          }}>
            {email}
          </div>

          {provider && (
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
                letterSpacing: '0.04em', color: 'var(--color-nucleus)',
                border: '1px solid rgba(255,90,31,0.35)',
                background: 'rgba(255,90,31,0.07)',
                padding: '0.4rem 0.8rem',
                textDecoration: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,90,31,0.6)'
                el.style.background  = 'rgba(255,90,31,0.13)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,90,31,0.35)'
                el.style.background  = 'rgba(255,90,31,0.07)'
              }}
            >
              Open {provider.name} <span style={{ opacity: 0.5 }}>↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,90,31,0.12)' }} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Unknown provider: generic nudge */}
        {!provider && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
            color: 'rgba(242,240,230,0.4)', lineHeight: 1.7,
            border: '1px solid rgba(242,240,230,0.08)',
            padding: '0.8rem 1rem',
          }}>
            Open your email client and look for a message from Multiverse Collective.
          </div>
        )}

        {/* Enter collective — secondary */}
        <button
          onClick={onEnter}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
            letterSpacing: '0.14em', color: 'rgba(242,240,230,0.55)',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1px solid rgba(242,240,230,0.1)',
            cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'rgba(242,240,230,0.85)'
            el.style.borderColor = 'rgba(242,240,230,0.22)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'rgba(242,240,230,0.55)'
            el.style.borderColor = 'rgba(242,240,230,0.1)'
          }}
        >
          Enter the workspace directly <span style={{ opacity: 0.5 }}>→</span>
        </button>
      </div>

      {/* Start over — tertiary text link */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onStartOver}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
            letterSpacing: '0.18em', color: 'rgba(242,240,230,0.25)',
            textDecoration: 'underline', textUnderlineOffset: 3,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,230,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,230,0.25)' }}
        >
          Use a different email
        </button>
      </div>

    </div>
  )
}
