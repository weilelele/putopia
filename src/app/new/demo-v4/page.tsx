'use client'

/* Onboarding v4 — clickable DEMO of the new flow (front-end only, no backend).
   Flow: email → path → info(region/gender/age) → info(recently watched) →
   branch question (World Builder = world choice · Device Seeker = device traits)
   → processing / activation. Aligned to docs/design-system.md (mono font,
   color and font-size tokens, HudField inputs, btn-primary, ChoiceCards).
   Delete before merge. */

import { useState, useEffect, Children, type ReactNode } from 'react'
import { HudField } from '@/components/hud-field'
import { ChoiceCards, WorldChoiceCards, ConsoleChoiceCards, FlameSlider, URGENCY_READINGS, URGENCY_END_LABELS } from '@/components/flame-slider'
import { getOnboardingVariants } from '@/lib/actions/onboarding-variants'
import { resolveVariant } from '@/lib/onboarding-variants'

type Path = 'world_builder' | 'device_seeker'
type Step = 'intro' | 'q1' | 'q3' | 'email' | 'path' | 'info1' | 'info2' | 'branch' | 'processing'
/* Front questions (q1 Console curiosity, q3 Urgency) come from the existing
   onboarding; the World question (old q2) moved to the World Builder branch. */
const STEP_ORDER: Step[] = ['q1', 'q3', 'email', 'path', 'branch', 'info1', 'info2', 'processing']

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const AGES = ['Under 18', '18–24', '25–34', '35–44', '45–55', '55+']

const DEVICE_OPTIONS = [
  { id: 'mystic',  text: 'Mystic — its last keeper moved in occult, spiritual circles.' },
  { id: 'studied', text: 'Studied — its last owner probed it with relentless science.' },
  { id: 'sealed',  text: 'Sealed — hidden in an unthinkable place, and perfectly preserved.' },
  { id: 'origin',  text: 'Origin — among the very first to reach this world.' },
] as const

export default function OnboardingV4Demo() {
  const [step, setStep] = useState<Step>('intro')
  const [email, setEmail] = useState('')
  const [path, setPath] = useState<Path | null>(null)
  const [region, setRegion] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [watched, setWatched] = useState('')
  const [world, setWorld] = useState('')
  const [device, setDevice] = useState('')
  const [locked, setLocked] = useState(false)
  const [consoleInterest, setConsoleInterest] = useState('')
  const [urgency, setUrgency] = useState(0)
  const [urgencyTouched, setUrgencyTouched] = useState(false)
  const [video, setVideo] = useState('')

  useEffect(() => {
    // Pull the real onboarding video (DB-driven) so the demo header matches /new.
    getOnboardingVariants()
      .then(vs => { try { setVideo(resolveVariant(vs, {}).videoQ1 || '') } catch { /* demo: no video */ } })
      .catch(() => {})
  }, [])

  const stepNo = STEP_ORDER.indexOf(step) + 1
  const restart = () => {
    setStep('intro'); setEmail(''); setPath(null); setRegion(''); setGender('')
    setAge(''); setWatched(''); setWorld(''); setDevice(''); setLocked(false)
    setConsoleInterest(''); setUrgency(0); setUrgencyTouched(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--color-deep)', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2.5rem 0' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', color: 'rgba(255,107,53,0.7)', background: 'rgba(255,107,53,0.06)', padding: 5, borderBottom: '1px solid var(--bd-cyan-2)' }}>
        DEV · ONBOARDING v4 DEMO · front-end only
      </div>

      <div style={{ width: '100%', maxWidth: 500, margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Video header (same source as /new) — shown once past the landing */}
        {step !== 'intro' && video && <VideoBlock src={video} />}

        {/* progress (hidden on the intro landing) */}
        {step !== 'intro' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', margin: '0 0 1.75rem' }}>
            {STEP_ORDER.map((s, i) => (
              <span key={s} style={{ width: i + 1 === stepNo ? 22 : 8, height: 4, borderRadius: 'var(--radius)', background: i + 1 <= stepNo ? 'var(--color-nucleus)' : 'rgba(245,245,245,0.15)', transition: 'all .3s' }} />
            ))}
            <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)' }}>{stepNo}/{STEP_ORDER.length}</span>
          </div>
        )}

        {step === 'intro' && (
          <div style={{ textAlign: 'center', animation: 'v4rise 0.6s cubic-bezier(0.2,0.7,0.2,1) both' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/vi-icon.png" alt="Multiverse Collective" style={{ width: 116, height: 'auto', display: 'block', margin: '0 auto 1.5rem', filter: 'drop-shadow(0 0 16px rgba(255,107,53,0.4)) drop-shadow(0 0 32px rgba(255,107,53,0.15))' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-h2)', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-nucleus)', lineHeight: 1.1 }}>MULTIVERSE<br />COLLECTIVE</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body)', color: 'var(--color-star)', lineHeight: 1.55, margin: '1.5rem auto 0', maxWidth: 340 }}>We own devices looking into parallel worlds.</p>
            <Primary onClick={() => setStep('q1')}>Begin →</Primary>
          </div>
        )}

        {step === 'q1' && (
          <Card eyebrow="MULTIVERSE COLLECTIVE" title="What do you most want to know about the Multiverse Console?">
            <ConsoleChoiceCards selected={consoleInterest} onSelect={id => { setConsoleInterest(id); setTimeout(() => setStep('q3'), 340) }} />
          </Card>
        )}

        {step === 'q3' && (
          <Card eyebrow="MULTIVERSE COLLECTIVE" title="How urgently do you want to join the Collective and explore parallel worlds yourself?">
            <FlameSlider value={urgency} readings={URGENCY_READINGS} endLabels={URGENCY_END_LABELS} onChange={v => { setUrgency(v); setUrgencyTouched(true) }} />
            {urgencyTouched && <Primary onClick={() => setStep('email')}>Continue →</Primary>}
          </Card>
        )}

        {step === 'email' && (
          <Card eyebrow="MULTIVERSE COLLECTIVE" title="Leave your signal.">
            <p style={sub}>Your email is where the Collective reaches you.</p>
            <HudField legend="YOUR EMAIL">
              <input className="input-dark" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operative@domain.void" />
            </HudField>
            <Primary disabled={!email.includes('@')} onClick={() => setStep('path')}>Continue →</Primary>
          </Card>
        )}

        {step === 'path' && (
          <Card eyebrow="CHOOSE YOUR POSITION" title="Where do you stand in the Collective?">
            <p style={sub}>Two roles. This shapes what we send you.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
              <PathCard icon={<WorldIcon />} title="World Builder" tagline="Imagine and shape the worlds we reach." onClick={() => { setLocked(false); setPath('world_builder'); setStep('branch') }} />
              <PathCard icon={<DeviceIcon />} title="Device Seeker" tagline="Hunt the devices that reach them." locked onClick={() => setLocked(true)} />
            </div>
            {locked && (
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0.9rem 0 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)' }}>
                <LockGlyph /> This position isn&apos;t open yet.
              </p>
            )}
          </Card>
        )}

        {step === 'info1' && (
          <Card eyebrow={path === 'device_seeker' ? 'DEVICE SEEKER' : 'WORLD BUILDER'} title="Who's operating?">
            <HudField legend="WHERE ARE YOU BASED?" style={{ marginBottom: '1rem' }}>
              <input className="input-dark" value={region} onChange={e => setRegion(e.target.value)} placeholder="City / region" />
            </HudField>
            <FieldLabel>GENDER</FieldLabel>
            <Chips options={GENDERS} value={gender} onChange={setGender} />
            <FieldLabel style={{ marginTop: '1rem' }}>AGE RANGE</FieldLabel>
            <Chips options={AGES} value={age} onChange={setAge} />
            <Primary disabled={!region || !gender || !age} onClick={() => setStep('info2')}>Continue →</Primary>
          </Card>
        )}

        {step === 'info2' && (
          <Card eyebrow={path === 'device_seeker' ? 'DEVICE SEEKER' : 'WORLD BUILDER'} title="What have you been watching lately?">
            <p style={sub}>Shows, films, videos — anything you can&apos;t stop returning to.</p>
            <HudField legend="RECENTLY WATCHED">
              <textarea className="input-dark" value={watched} onChange={e => setWatched(e.target.value)} placeholder="Name a few…" rows={3} style={{ resize: 'none' }} />
            </HudField>
            <Primary disabled={!watched.trim()} onClick={() => setStep('processing')}>Continue →</Primary>
          </Card>
        )}

        {step === 'branch' && path === 'world_builder' && (
          <Card eyebrow="WORLD BUILDER" title="Which world should the Console show you first?">
            <WorldChoiceCards selected={world} onSelect={id => { setWorld(id); setStep('info1') }} />
          </Card>
        )}

        {step === 'branch' && path === 'device_seeker' && (
          <Card eyebrow="DEVICE SEEKER" title="Which device would you track down first?">
            <ChoiceCards options={DEVICE_OPTIONS} selected={device} onSelect={id => { setDevice(id); setStep('info1') }} />
          </Card>
        )}

        {step === 'processing' && (
          <Card eyebrow="APPLICATION IN REVIEW" title="Welcome to the Multiverse Collective.">
            <p style={sub}>Two things now —</p>
            <div className="hud-frame" style={guide}>
              <div style={guideLabel}>① IN ~8 HOURS</div>
              <p style={guideText}>Your first assignment arrives — the Collective sends it in about eight hours{path ? `, matched to ${path === 'world_builder' ? 'World Builder' : 'Device Seeker'}` : ''}.</p>
            </div>
            <div className="hud-frame" style={guide}>
              <div style={guideLabel}>② ACTIVATE YOUR ACCOUNT</div>
              <p style={guideText}>Confirm your internal account to see more about the organization.</p>
              <a href="https://mail.google.com/mail/" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', marginTop: 10, padding: '0.55rem 1.1rem' }}>Open Gmail →</a>
            </div>
            <a href="/console" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1.4rem' }}>Enter the Space →</a>
            <button type="button" onClick={restart} style={{ display: 'block', margin: '0.85rem auto 0', background: 'none', border: 'none', color: 'var(--color-star-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', cursor: 'pointer' }}>↺ replay demo</button>
          </Card>
        )}

        {step !== 'email' && step !== 'processing' && (
          <button type="button" onClick={restart} style={{ display: 'block', margin: '1.25rem auto 0', background: 'none', border: 'none', color: 'var(--color-star-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', cursor: 'pointer' }}>↺ restart</button>
        )}
      </div>
    </div>
  )
}

function Card({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  // Staggered top-to-bottom reveal: eyebrow → title → each content block rises
  // in on a steady beat, so a step reads as a sequence, not a dumped form.
  const rows: ReactNode[] = [
    <div key="eb" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nucleus)', textAlign: 'center' }}>{eyebrow}</div>,
    <h1 key="ti" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-h3)', color: 'var(--color-star)', textAlign: 'center', margin: '0.7rem 0 1.25rem', lineHeight: 1.35, fontWeight: 700 }}>{title}</h1>,
    ...Children.toArray(children),
  ]
  return (
    <div>
      <style>{`@keyframes v4rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
      {rows.map((row, i) => (
        <div key={i} style={{ animation: 'v4rise 0.5s cubic-bezier(0.2,0.7,0.2,1) both', animationDelay: `${90 + i * 95}ms` }}>{row}</div>
      ))}
    </div>
  )
}

function PathCard({ icon, title, tagline, onClick, locked }: { icon: ReactNode; title: string; tagline: string; onClick: () => void; locked?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '1.5rem 0.9rem', background: 'transparent', border: '1px solid var(--bd-faint)', borderRadius: 'var(--radius)', color: 'var(--color-star-dim)', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1, transition: 'all 0.15s ease' }}
      onMouseEnter={locked ? undefined : e => { const el = e.currentTarget; el.style.borderColor = 'var(--bd-orange)'; el.style.background = 'rgba(255,107,53,0.06)'; el.style.color = 'var(--color-star)' }}
      onMouseLeave={locked ? undefined : e => { const el = e.currentTarget; el.style.borderColor = 'var(--bd-faint)'; el.style.background = 'transparent'; el.style.color = 'var(--color-star-dim)' }}
    >
      {locked && <span style={{ position: 'absolute', top: 8, right: 9, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', color: 'var(--color-star-dim)', border: '1px solid var(--bd-faint)', padding: '1px 6px', borderRadius: 'var(--radius)' }}>SOON</span>}
      <span style={{ color: locked ? 'var(--color-star-deep)' : 'var(--color-nucleus)' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-title)', fontWeight: 700, color: locked ? 'var(--color-star-dim)' : 'var(--color-star)', letterSpacing: '0.02em' }}>{title}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', lineHeight: 1.5, color: 'var(--color-star-deep)' }}>{tagline}</span>
    </button>
  )
}

function LockGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" stroke="var(--color-star-dim)" strokeWidth="1.6" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="var(--color-star-dim)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function FieldLabel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: 'var(--color-star-dim)', margin: '0 0 8px', ...style }}>{children}</div>
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const on = value === o
        return (
          <button key={o} type="button" onClick={() => onChange(o)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', padding: '7px 13px', borderRadius: 'var(--radius)', cursor: 'pointer',
            background: on ? 'rgba(232,93,4,0.1)' : 'transparent', color: on ? 'var(--color-star)' : 'var(--color-star-dim)',
            border: `1px solid ${on ? 'var(--bd-orange)' : 'var(--bd-faint)'}`, fontWeight: on ? 700 : 400, transition: 'all 0.15s',
          }}>{o}</button>
        )
      })}
    </div>
  )
}

function Primary({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="btn-primary" onClick={onClick} disabled={disabled} style={{ width: '100%', justifyContent: 'center', marginTop: '1.4rem' }}>
      {children}
    </button>
  )
}

function VideoBlock({ src }: { src: string }) {
  return (
    <div style={{ width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius)', margin: '0 0 1.5rem' }}>
      { }
      <video src={src} autoPlay muted loop playsInline style={{ width: '100%', display: 'block', filter: 'contrast(1.12) saturate(0.88) brightness(0.8)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(5,8,22,0.72) 100%)' }} />
    </div>
  )
}

function WorldIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="24" cy="24" r="17" />
      <ellipse cx="24" cy="24" rx="7.5" ry="17" />
      <line x1="7" y1="24" x2="41" y2="24" />
      <path d="M10 16 Q24 21 38 16" strokeLinecap="round" />
      <path d="M10 32 Q24 27 38 32" strokeLinecap="round" />
    </svg>
  )
}

function DeviceIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="7" y="15" width="34" height="21" rx="2.5" />
      <circle cx="24" cy="25.5" r="6" />
      <line x1="24" y1="15" x2="24" y2="9" strokeLinecap="round" />
      <circle cx="24" cy="7" r="1.6" fill="currentColor" stroke="none" />
      <line x1="12" y1="40" x2="36" y2="40" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

const sub: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 1.25rem' }
const guide: React.CSSProperties = { padding: '1rem 1.1rem', margin: '0 0 0.75rem' }
const guideLabel: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: 'var(--color-nucleus)' }
const guideText: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star)', margin: '6px 0 0', lineHeight: 1.6 }
