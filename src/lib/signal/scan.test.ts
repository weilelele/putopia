import { describe, it, expect } from 'vitest'
import {
  rollScanUntil,
  rollSearchUntil,
  scanSecondsLeft,
  scanComplete,
  worldScanState,
  SCAN_MIN_HOURS,
  SCAN_MAX_HOURS,
  SEARCH_MIN_HOURS,
  SEARCH_MAX_HOURS,
} from './scan'

const H = 3_600_000
const T0 = 1_700_000_000_000 // fixed epoch ms for deterministic tests

describe('rollScanUntil', () => {
  it('rand=0 lands exactly at the minimum hours', () => {
    expect(rollScanUntil(T0, 0)).toBe(new Date(T0 + SCAN_MIN_HOURS * H).toISOString())
  })

  it('rand=1 lands exactly at the maximum hours', () => {
    expect(rollScanUntil(T0, 1)).toBe(new Date(T0 + SCAN_MAX_HOURS * H).toISOString())
  })

  it('rand=0.5 lands at the midpoint of the window', () => {
    expect(rollScanUntil(T0, 0.5)).toBe(new Date(T0 + 7 * H).toISOString())
  })

  it('clamps out-of-range rand into the window', () => {
    expect(rollScanUntil(T0, -3)).toBe(rollScanUntil(T0, 0))
    expect(rollScanUntil(T0, 9)).toBe(rollScanUntil(T0, 1))
  })

  it('honours a custom window', () => {
    expect(rollScanUntil(T0, 1, 8, 20)).toBe(new Date(T0 + 20 * H).toISOString())
  })
})

describe('rollSearchUntil', () => {
  it('rolls within the 8-20h inter-day window', () => {
    expect(rollSearchUntil(T0, 0)).toBe(new Date(T0 + SEARCH_MIN_HOURS * H).toISOString())
    expect(rollSearchUntil(T0, 1)).toBe(new Date(T0 + SEARCH_MAX_HOURS * H).toISOString())
    expect(rollSearchUntil(T0, 0.5)).toBe(new Date(T0 + 14 * H).toISOString())
  })
})

describe('scanSecondsLeft', () => {
  it('counts whole seconds remaining', () => {
    const until = new Date(T0 + 90_000).toISOString()
    expect(scanSecondsLeft(until, T0)).toBe(90)
  })

  it('is 0 once elapsed, never negative', () => {
    const until = new Date(T0 - 5_000).toISOString()
    expect(scanSecondsLeft(until, T0)).toBe(0)
  })

  it('treats null / invalid as 0', () => {
    expect(scanSecondsLeft(null, T0)).toBe(0)
    expect(scanSecondsLeft('not-a-date', T0)).toBe(0)
  })
})

describe('scanComplete', () => {
  it('false while time remains, true after', () => {
    expect(scanComplete(new Date(T0 + H).toISOString(), T0)).toBe(false)
    expect(scanComplete(new Date(T0 - H).toISOString(), T0)).toBe(true)
  })

  it('null counts as complete (legacy worlds)', () => {
    expect(scanComplete(null, T0)).toBe(true)
  })
})

describe('worldScanState', () => {
  const future = new Date(T0 + H).toISOString()
  const past = new Date(T0 - H).toISOString()

  it('scanning while the window is open, regardless of content', () => {
    expect(worldScanState(future, false, T0)).toBe('scanning')
    expect(worldScanState(future, true, T0)).toBe('scanning')
  })

  it('ready when the scan completed with content', () => {
    expect(worldScanState(past, true, T0)).toBe('ready')
  })

  it('failed when the scan completed with no content', () => {
    expect(worldScanState(past, false, T0)).toBe('failed')
  })

  it('legacy worlds (no scan_until) never fail: ready with content, none without', () => {
    expect(worldScanState(null, true, T0)).toBe('ready')
    expect(worldScanState(null, false, T0)).toBe('none')
  })
})
