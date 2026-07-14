/**
 * Signal Scanning ceremony — pure time math, shared by server (submit, gating)
 * and client (countdown hero). No DB / env / DOM imports: keep it testable.
 *
 * Model: filing a sighting rolls a `scan_until` a random 6-8h out. Until then
 * the world is SCANNING (the proposer watches a countdown). When the scan
 * completes the world is READY if an Architect tuned a signal in the window,
 * otherwise FAILED. Legacy worlds (scan_until = null) skip the ceremony.
 */

export const SCAN_MIN_HOURS = 6
export const SCAN_MAX_HOURS = 8

// Inter-day "Signal Searching" windows are longer than the initial scan.
export const SEARCH_MIN_HOURS = 8
export const SEARCH_MAX_HOURS = 20

export type WorldScanState = 'scanning' | 'ready' | 'failed' | 'none'

/**
 * Roll a scan-completion timestamp `minHours..maxHours` out from `fromMs`.
 * `rand` is a 0..1 value (inject Math.random() at the call site) so this stays
 * pure and unit-testable.
 */
export function rollScanUntil(
  fromMs: number,
  rand: number,
  minHours: number = SCAN_MIN_HOURS,
  maxHours: number = SCAN_MAX_HOURS,
): string {
  const r = Math.max(0, Math.min(1, rand))
  const span = Math.max(0, maxHours - minHours) * 3_600_000
  return new Date(fromMs + minHours * 3_600_000 + r * span).toISOString()
}

/** Roll an inter-day search-window end (random 8-20h out from `fromMs`). */
export function rollSearchUntil(fromMs: number, rand: number): string {
  return rollScanUntil(fromMs, rand, SEARCH_MIN_HOURS, SEARCH_MAX_HOURS)
}

/** Whole seconds until the scan completes; 0 once it has (or if unset/invalid). */
export function scanSecondsLeft(scanUntil: string | null, now: number = Date.now()): number {
  if (!scanUntil) return 0
  const t = new Date(scanUntil).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.ceil((t - now) / 1000))
}

/** Has the scan window elapsed? Unset / invalid timestamps count as complete. */
export function scanComplete(scanUntil: string | null, now: number = Date.now()): boolean {
  return scanSecondsLeft(scanUntil, now) === 0
}

/**
 * Derive a world's scan-phase state for the detail page.
 * `hasContent` = an investigation/thread with published days exists for it.
 */
export function worldScanState(
  scanUntil: string | null,
  hasContent: boolean,
  now: number = Date.now(),
): WorldScanState {
  if (!scanUntil) return hasContent ? 'ready' : 'none'
  if (!scanComplete(scanUntil, now)) return 'scanning'
  return hasContent ? 'ready' : 'failed'
}
