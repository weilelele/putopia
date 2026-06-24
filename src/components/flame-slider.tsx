'use client'

import { useRef, useEffect, useCallback } from 'react'

/* ── Shared constants used by the onboarding flow (and the legacy /demo) ── */

export const WORLD_OPTIONS = [
  { id: 'new_life', text: 'A new possibility for life — a world where everything could be different.' },
  { id: 'fantasy',  text: 'A world long imagined — one I cannot stop thinking about.' },
  { id: 'reunion',  text: 'A precious reunion — someone or something I thought was lost.' },
  { id: 'other',    text: 'Other — I will describe it myself.' },
] as const

export type WorldId = typeof WORLD_OPTIONS[number]['id']

/* Q1 — what the visitor most wants to know about the Multiverse Console. */
export const CONSOLE_OPTIONS = [
  { id: 'mechanism', text: 'How does it actually work?' },
  { id: 'worlds',    text: 'Which parallel worlds can it reach?' },
  { id: 'personal',  text: 'Can it show me worlds connected to my own?' },
  { id: 'access',    text: 'The tech, the price, and how to get one.' },
] as const

export type ConsoleInterestId = typeof CONSOLE_OPTIONS[number]['id']

/* ── Slider copy ──
   The slider mechanic is shared; the copy is swappable via props. */

export const BELIEF_READINGS = [
  '',
  'A faint signal.',
  'Something stirs.',
  'The signal is real.',
  'Strong resonance.',
  'FREQUENCY CONFIRMED.',
]
const BELIEF_END_LABELS: Record<number, string> = { 0: 'Not at all', 5: 'I can feel it' }

/* Q3 — join-urgency slider. */
export const URGENCY_READINGS = [
  '',
  'A quiet curiosity.',
  'The pull begins.',
  'I want in.',
  'Barely able to wait.',
  'TAKE ME IN.',
]
export const URGENCY_END_LABELS: Record<number, string> = { 0: 'Just curious', 5: "I'm ready now" }

/** Converts the old belief slider value (0–5) into a `reason` string. */
export function beliefToReason(value: number): string {
  return `Signal level ${value}/5 — ${BELIEF_READINGS[value] ?? ''}`
}

/** Converts the join-urgency slider value (0–5) into the `reason` string stored in the DB. */
export function urgencyToReason(value: number): string {
  return `Join urgency ${value}/5 — ${URGENCY_READINGS[value] ?? ''}`
}

/* ── FlameSlider component ──
   Copy (end labels + per-step readings) is parametrised; defaults preserve the
   original belief-slider wording so legacy callers are unaffected. Tick marks
   are absolutely positioned at value/5 so they line up exactly with the thumb. */

export function FlameSlider({
  value,
  onChange,
  readings = BELIEF_READINGS,
  endLabels = BELIEF_END_LABELS,
}: {
  value: number
  onChange: (v: number) => void
  readings?: readonly string[]
  endLabels?: Record<number, string>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pct      = (value / 5) * 100

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

      {/* Track — outer wrapper has generous vertical padding for easy clicking */}
      <div
        onMouseDown={e => { dragging.current = true; onChange(valueFromX(e.clientX)) }}
        onTouchStart={e => { e.preventDefault(); onChange(valueFromX(e.touches[0].clientX)) }}
        onTouchMove={e  => { e.preventDefault(); onChange(valueFromX(e.touches[0].clientX)) }}
        style={{ padding: '10px 0', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}
      >
        <div ref={trackRef} style={{ position: 'relative', height: 10, background: 'rgba(26,31,43,0.9)' }}>
          {/* Flame fill */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
            background: 'linear-gradient(90deg, #6B1200, #C8401A, #FF6B35, #FF8C20, #FFB830)',
            boxShadow: `0 0 ${glowPx}px rgba(255,90,31,${glowAlph}), 0 0 ${glowPx * 2}px rgba(255,90,31,${glowAlph * 0.4})`,
            transition: 'width 0.08s ease, box-shadow 0.15s ease',
            pointerEvents: 'none',
          }} />
          {/* Thumb */}
          <div style={{
            position: 'absolute', top: '50%', left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 22, height: 22, borderRadius: '50%',
            background: value > 0
              ? 'radial-gradient(circle at 38% 38%, #FFE0A0, #FF8C20, #FF6B35)'
              : 'rgba(36,41,56,0.95)',
            border: `1.5px solid ${value > 0 ? 'rgba(255,180,60,0.75)' : 'rgba(242,240,230,0.18)'}`,
            boxShadow: value > 0
              ? `0 0 ${6 + value * 3}px rgba(255,140,32,${0.4 + value * 0.08}), 0 0 ${12 + value * 5}px rgba(255,90,31,${0.2 + value * 0.05})`
              : 'none',
            transition: 'all 0.1s ease',
            pointerEvents: 'none', zIndex: 2,
          }} />
        </div>

        {/* Tick marks — absolutely positioned at value/5 so they align with the thumb */}
        <div style={{ position: 'relative', height: 4, marginTop: '0.55rem' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} onClick={() => onChange(i)} style={{
              position: 'absolute', left: `${(i / 5) * 100}%`, transform: 'translateX(-50%)',
              width: 1, height: 4,
              background: i <= value && value > 0
                ? `rgba(255,${140 - i * 8},32,0.75)`
                : 'rgba(242,240,230,0.12)',
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
          transition: 'color 0.12s',
        }}>
          {endLabels[0]}
        </span>
        <span style={{
          position: 'absolute', right: 0,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.05em',
          color: value === 5 ? 'rgba(255,135,32,0.85)' : 'rgba(242,240,230,0.3)',
          transition: 'color 0.12s',
        }}>
          {endLabels[5]}
        </span>
      </div>

      {/* Live reading */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em',
        color: 'rgba(255,140,32,0.65)',
        minHeight: '1.2rem',
        transition: 'opacity 0.25s ease',
        opacity: value > 0 ? 1 : 0,
      }}>
        {value > 0 && `${value} / 5 — ${readings[value]}`}
      </div>

    </div>
  )
}

/* ── ChoiceCards — shared card-style single-choice widget ── */

export function ChoiceCards({ options, selected, onSelect }: {
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
              background:  isSelected ? 'rgba(232,93,4,0.07)' : 'transparent',
              border:      `1px solid ${isSelected ? 'rgba(232,93,4,0.4)' : 'rgba(242,240,230,0.08)'}`,
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

/* World-choice (Q2) — thin wrapper over ChoiceCards. */
export function WorldChoiceCards({ selected, onSelect }: {
  selected: string
  onSelect: (id: string) => void
}) {
  return <ChoiceCards options={WORLD_OPTIONS} selected={selected} onSelect={onSelect} />
}

/* Console-curiosity (Q1) — thin wrapper over ChoiceCards. */
export function ConsoleChoiceCards({ selected, onSelect }: {
  selected: string
  onSelect: (id: string) => void
}) {
  return <ChoiceCards options={CONSOLE_OPTIONS} selected={selected} onSelect={onSelect} />
}
