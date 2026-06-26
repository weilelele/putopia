import { describe, it, expect } from 'vitest'
import {
  revealAt, isRevealed, DEFAULT_REVEAL_INTERVAL_HOURS,
  buildSchedule, tuningPhase, hasOpened, VOTE_WINDOW_HOURS,
  type PublishedDay,
} from './reveal'

const ANCHOR = '2026-06-01T00:00:00.000Z'

describe('revealAt', () => {
  it('returns null when the schedule has not started', () => {
    expect(revealAt(null, 24, 3)).toBeNull()
  })

  it('returns the anchor itself for day 0', () => {
    expect(revealAt(ANCHOR, 24, 0)?.toISOString()).toBe(ANCHOR)
  })

  it('adds interval * dayIndex hours', () => {
    expect(revealAt(ANCHOR, 24, 1)?.toISOString()).toBe('2026-06-02T00:00:00.000Z')
    expect(revealAt(ANCHOR, 24, 3)?.toISOString()).toBe('2026-06-04T00:00:00.000Z')
  })

  it('honours a custom interval', () => {
    expect(revealAt(ANCHOR, 1, 5)?.toISOString()).toBe('2026-06-01T05:00:00.000Z')
  })

  it('falls back to the default interval when given a non-positive value', () => {
    const expected = new Date(Date.parse(ANCHOR) + 2 * DEFAULT_REVEAL_INTERVAL_HOURS * 3_600_000)
    expect(revealAt(ANCHOR, 0, 2)?.toISOString()).toBe(expected.toISOString())
  })

  it('returns null for an unparseable anchor', () => {
    expect(revealAt('not-a-date', 24, 1)).toBeNull()
  })
})

describe('isRevealed', () => {
  it('is false before the reveal time', () => {
    expect(isRevealed(ANCHOR, 24, 2, new Date('2026-06-02T23:59:00.000Z'))).toBe(false)
  })

  it('is true exactly at the reveal time', () => {
    expect(isRevealed(ANCHOR, 24, 2, new Date('2026-06-03T00:00:00.000Z'))).toBe(true)
  })

  it('is true after the reveal time', () => {
    expect(isRevealed(ANCHOR, 24, 0, new Date('2026-06-10T00:00:00.000Z'))).toBe(true)
  })

  it('never reveals when the schedule has not started', () => {
    expect(isRevealed(null, 24, 0, new Date('2030-01-01T00:00:00.000Z'))).toBe(false)
  })
})

// ── Signal Tuning gap schedule (forward chain) ────────────────────────────────

const T0 = '2026-06-01T00:00:00.000Z'
const T0_MS = Date.parse(T0)
const H = 3_600_000
/** ISO timestamp `h` hours after the anchor. */
const at = (h: number) => new Date(T0_MS + h * H)
const atISO = (h: number) => at(h).toISOString()
const pub = (...days: number[]): PublishedDay[] => days.map((d) => ({ dayIndex: d, publishedAtISO: T0 }))

describe('VOTE_WINDOW_HOURS', () => {
  it('is the fixed 24h voting window', () => {
    expect(VOTE_WINDOW_HOURS).toBe(24)
  })
})

describe('hasOpened', () => {
  it('is false for a null open time', () => {
    expect(hasOpened(null, T0_MS)).toBe(false)
  })
  it('is true once the open time has passed', () => {
    expect(hasOpened(at(10), T0_MS + 11 * H)).toBe(true)
    expect(hasOpened(at(10), T0_MS + 10 * H)).toBe(true)
  })
  it('is false before the open time', () => {
    expect(hasOpened(at(10), T0_MS + 9 * H)).toBe(false)
  })
})

describe('buildSchedule', () => {
  it('returns [] when the schedule has not started (no anchor)', () => {
    expect(buildSchedule(null, 4, pub(0, 1))).toEqual([])
  })

  it('returns [] for an unparseable anchor', () => {
    expect(buildSchedule('not-a-date', 4, pub(0))).toEqual([])
  })

  it('returns [] when day 0 is not published', () => {
    expect(buildSchedule(T0, 4, [{ dayIndex: 1, publishedAtISO: T0 }])).toEqual([])
  })

  it('day 0 opens at the anchor; cycle = 24 + gap', () => {
    // gap = 4 → cycle = 28h. All authored up front (published at the anchor).
    const s = buildSchedule(T0, 4, pub(0, 1, 2))
    expect(s.map((d) => d.openAt.toISOString())).toEqual([atISO(0), atISO(28), atISO(56)])
    expect(s.map((d) => d.closeAt.toISOString())).toEqual([atISO(24), atISO(52), atISO(80)])
  })

  it('gap = 0 makes questions back-to-back (24h cycle)', () => {
    const s = buildSchedule(T0, 0, pub(0, 1, 2))
    expect(s.map((d) => d.openAt.toISOString())).toEqual([atISO(0), atISO(24), atISO(48)])
  })

  it('stops at the first unpublished day (no skipping holes)', () => {
    // days 0 and 2 published, 1 missing → chain stops after day 0.
    const s = buildSchedule(T0, 4, [
      { dayIndex: 0, publishedAtISO: T0 },
      { dayIndex: 2, publishedAtISO: T0 },
    ])
    expect(s.map((d) => d.dayIndex)).toEqual([0])
  })

  it('a late-published day opens at its publish time, not the scheduled slot', () => {
    // day 2 authored 84h in (well past its 56h scheduled slot) → opens at 84h,
    // its 24h window runs from there.
    const s = buildSchedule(T0, 4, [
      { dayIndex: 0, publishedAtISO: T0 },
      { dayIndex: 1, publishedAtISO: T0 },
      { dayIndex: 2, publishedAtISO: atISO(84) },
    ])
    expect(s[2].openAt.toISOString()).toBe(atISO(84))
    expect(s[2].closeAt.toISOString()).toBe(atISO(108))
  })
})

describe('tuningPhase', () => {
  const SCHED = buildSchedule(T0, 4, pub(0, 1, 2)) // opens 0/28/56, closes 24/52/80

  it('is "before" when now precedes day 0', () => {
    expect(tuningPhase(SCHED, 4, at(-1)).kind).toBe('before')
  })

  it('is "before" for an empty schedule', () => {
    expect(tuningPhase([], 4, at(100)).kind).toBe('before')
  })

  it('is "open" inside a question window', () => {
    const p = tuningPhase(SCHED, 4, at(12))
    expect(p).toEqual({ kind: 'open', index: 0, closeAt: at(24) })
  })

  it('opens the next question exactly at its open time', () => {
    expect(tuningPhase(SCHED, 4, at(28))).toEqual({ kind: 'open', index: 1, closeAt: at(52) })
  })

  it('is "gap" after a question closes, counting down to the next', () => {
    // day 0 closes at 24h, day 1 opens at 28h → 24..28h is the gap.
    expect(tuningPhase(SCHED, 4, at(24))).toEqual({ kind: 'gap', index: 0, nextOpenAt: at(28) })
    expect(tuningPhase(SCHED, 4, at(26))).toEqual({ kind: 'gap', index: 0, nextOpenAt: at(28) })
  })

  it('after the last question: "gap" until the scheduled next open', () => {
    // day 2 closes at 80h; next scheduled open = 56 + 28 = 84h. No day 3 yet.
    expect(tuningPhase(SCHED, 4, at(82))).toEqual({ kind: 'gap', index: 2, nextOpenAt: at(84) })
  })

  it('"search_failed" once the next question is overdue and unpublished', () => {
    expect(tuningPhase(SCHED, 4, at(90))).toEqual({ kind: 'search_failed', index: 2 })
  })

  it('recovers immediately when the overdue question is finally published', () => {
    // Same world, day 2 now authored late at 90h. At 90h it opens at once.
    const recovered = buildSchedule(T0, 4, [
      { dayIndex: 0, publishedAtISO: T0 },
      { dayIndex: 1, publishedAtISO: T0 },
      { dayIndex: 2, publishedAtISO: atISO(90) },
    ])
    expect(tuningPhase(recovered, 4, at(90))).toEqual({ kind: 'open', index: 2, closeAt: at(114) })
  })

  it('gap = 0: the next question opens the instant the current closes', () => {
    const s = buildSchedule(T0, 0, pub(0, 1)) // opens 0/24, closes 24/48
    expect(tuningPhase(s, 0, at(24))).toEqual({ kind: 'open', index: 1, closeAt: at(48) })
  })
})
