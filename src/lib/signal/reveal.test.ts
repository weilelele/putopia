import { describe, it, expect } from 'vitest'
import { revealAt, isRevealed, DEFAULT_REVEAL_INTERVAL_HOURS } from './reveal'

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
