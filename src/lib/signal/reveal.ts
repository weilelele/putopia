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
