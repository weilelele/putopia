/**
 * Scheduled day reveal — pure time math, shared by server (gating, recall) and
 * client (admin schedule preview). No DB / env / DOM imports: keep it testable.
 *
 * Model: a Signal Tuning thread has a `reveal_anchor_at` (when day 0 goes live)
 * and a `reveal_interval_hours` cadence. The day at `dayIndex = k` reveals at
 * `anchor + k * interval`. Days configured ahead of time surface one at a time.
 */

export const DEFAULT_REVEAL_INTERVAL_HOURS = 24

/** When the day at `dayIndex` reveals, or null if the schedule hasn't started. */
export function revealAt(
  anchorAt: string | null,
  intervalHours: number,
  dayIndex: number,
): Date | null {
  if (!anchorAt) return null
  const anchor = new Date(anchorAt).getTime()
  if (Number.isNaN(anchor)) return null
  const interval = intervalHours > 0 ? intervalHours : DEFAULT_REVEAL_INTERVAL_HOURS
  return new Date(anchor + Math.max(0, dayIndex) * interval * 3_600_000)
}

/** Has the day at `dayIndex` revealed as of `now`? Unstarted schedules never reveal. */
export function isRevealed(
  anchorAt: string | null,
  intervalHours: number,
  dayIndex: number,
  now: Date = new Date(),
): boolean {
  const at = revealAt(anchorAt, intervalHours, dayIndex)
  return at !== null && now.getTime() >= at.getTime()
}

// ── Signal Tuning gap schedule (forward chain) ────────────────────────────────
//
// Newer model (docs/signal-tuning-timing.md). Each question is OPEN for a fixed
// 24h voting window, then CLOSED for a configurable `gapHours` interval before
// the next question opens. Because a late-authored question opens the moment it
// is published (not on a rigid grid), open times are a forward chain, not the
// closed-form `anchor + k·interval` above:
//
//   openAt(0) = anchor                                   (= the world's scan_until)
//   openAt(k) = max(openAt(k-1) + cycle, publishedAt(k)) for k >= 1
//   closeAt(k) = openAt(k) + 24h          cycle = 24 + gapHours
//
// `revealAt`/`isRevealed` above stay for legacy callers (recall/engagement) until
// they migrate to `buildSchedule`.

/** Fixed per-question voting window. Not configurable (product decision). */
export const VOTE_WINDOW_HOURS = 24

/** Default inter-question gap when a thread has no explicit `gap_hours`. */
export const DEFAULT_GAP_HOURS = 4

const MS_PER_HOUR = 3_600_000

/** A published question's identity + when it went live (`signal_tasks.published_at`). */
export interface PublishedDay {
  dayIndex: number
  publishedAtISO: string
}

/** Resolved open/close window for one question. */
export interface DaySchedule {
  dayIndex: number
  openAt: Date
  closeAt: Date
}

/** Cycle length (open window + gap) in ms; clamps a negative gap to 0. */
function cycleMs(gapHours: number): number {
  return (VOTE_WINDOW_HOURS + Math.max(0, gapHours)) * MS_PER_HOUR
}

/**
 * Build the open/close chain for the contiguous run of published questions
 * starting at day 0. Stops at the first unpublished day (the chain can't skip a
 * hole). Returns [] if the schedule hasn't started (no anchor) or day 0 isn't
 * published yet. Pure — `publishedDays` carries each day's publish timestamp.
 */
export function buildSchedule(
  anchorISO: string | null,
  gapHours: number,
  publishedDays: PublishedDay[],
): DaySchedule[] {
  if (!anchorISO) return []
  const anchorMs = Date.parse(anchorISO)
  if (Number.isNaN(anchorMs)) return []

  const publishedMsByDay = new Map<number, number>()
  for (const d of publishedDays) {
    const ms = Date.parse(d.publishedAtISO)
    if (!Number.isNaN(ms)) publishedMsByDay.set(d.dayIndex, ms)
  }

  const cycle = cycleMs(gapHours)
  const out: DaySchedule[] = []
  let prevOpenMs = anchorMs
  for (let k = 0; publishedMsByDay.has(k); k++) {
    const publishedMs = publishedMsByDay.get(k)!
    // Day 0 opens at the anchor; later days at the scheduled slot, but never
    // before they were actually published (a late publish opens immediately).
    const openMs = k === 0 ? Math.max(anchorMs, publishedMs) : Math.max(prevOpenMs + cycle, publishedMs)
    out.push({ dayIndex: k, openAt: new Date(openMs), closeAt: new Date(openMs + VOTE_WINDOW_HOURS * MS_PER_HOUR) })
    prevOpenMs = openMs
  }
  return out
}

/** True once `openAt` has arrived (the question has opened). `now` is injectable
 *  so render code can call this without an impure `Date.now()` inline. */
export function hasOpened(openAt: Date | null, now: number = Date.now()): boolean {
  return !!openAt && openAt.getTime() <= now
}

/** The current phase of a thread's tuning timeline. */
export type TuningPhase =
  | { kind: 'before' }                                      // now < day 0 open (still scanning)
  | { kind: 'open'; index: number; closeAt: Date }          // question `index` accepting votes
  | { kind: 'gap'; index: number; nextOpenAt: Date }        // question `index` closed; next opens at nextOpenAt
  | { kind: 'search_failed'; index: number }                // next question overdue, not yet published

/**
 * Resolve which question (if any) is open right now, or whether we're in the
 * inter-question gap / a stalled "search failed" state. `schedule` is the output
 * of `buildSchedule` (contiguous published chain); `gapHours` sizes the gap.
 */
export function tuningPhase(
  schedule: DaySchedule[],
  gapHours: number,
  now: Date = new Date(),
): TuningPhase {
  if (!schedule.length) return { kind: 'before' }
  const nowMs = now.getTime()
  if (nowMs < schedule[0].openAt.getTime()) return { kind: 'before' }

  // The current question = the latest one already opened.
  let k = 0
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].openAt.getTime() <= nowMs) { k = i; break }
  }
  const current = schedule[k]
  if (nowMs < current.closeAt.getTime()) {
    return { kind: 'open', index: current.dayIndex, closeAt: current.closeAt }
  }

  // Current question closed. Is the next one published (present in the chain)?
  const next = schedule[k + 1]
  if (next) {
    // next.openAt is necessarily in the future here (else it would be `current`).
    return { kind: 'gap', index: current.dayIndex, nextOpenAt: next.openAt }
  }
  // Next question not authored yet: gap until its scheduled slot, then failed.
  const nextScheduledOpen = current.openAt.getTime() + cycleMs(gapHours)
  if (nowMs < nextScheduledOpen) {
    return { kind: 'gap', index: current.dayIndex, nextOpenAt: new Date(nextScheduledOpen) }
  }
  return { kind: 'search_failed', index: current.dayIndex }
}
