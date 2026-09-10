'use client'

import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput } from '@/components/archive-input'

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
  return <div className="archive-range">
    <ArchiveInput type="range" min={0} max={5} step={1} value={value}
      aria-label={readings === URGENCY_READINGS ? 'Join urgency' : 'Signal belief'}
      aria-valuetext={`${value} / 5${readings[value] ? ` — ${readings[value]}` : ''}`}
      onChange={event => onChange(Number(event.target.value))} />
    <div className="archive-range__labels"><span>{endLabels[0]}</span><span>{endLabels[5]}</span></div>
    <p className="archive-range__reading" aria-live="polite">{value > 0 ? `${value} / 5 — ${readings[value]}` : '\u00a0'}</p>
  </div>
}

/* ── ChoiceCards — shared card-style single-choice widget ── */

export function ChoiceCards({ options, selected, onSelect }: {
  options: readonly { id: string; text: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="archive-choice-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {options.map(opt => {
        const isSelected = selected === opt.id
        return (
          <ArchiveButton variant="secondary"
            type="button"
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`archive-choice${isSelected ? ' is-selected' : ''}`}
            aria-pressed={isSelected}
          >
            {opt.text}
          </ArchiveButton>
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
