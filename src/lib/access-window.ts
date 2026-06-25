/**
 * Guest access window — the timed "you may look inside" ritual on the console.
 *
 * A guest lands on a masked console (device intro + Storage check + Signal Feed
 * frosted over). Clicking "Yes, I will" opens a limited viewing window; a quiet
 * countdown rail runs on the right edge. The window start is stored in
 * localStorage so a refresh doesn't reset it (the positioning is ritual, not a
 * hard security boundary — no need to defend against tampering).
 *
 * Model: masked when there is NO active window (never opened, or already
 * elapsed); revealed while a window is active. So a brand-new visit is masked,
 * an in-window refresh stays revealed, and the mask returns once the window
 * lapses. Logged-in members never see the mask (gated on role upstream).
 *
 * The soft "your window ended" flicker (PRD 4.3) is intentionally not built yet
 * — lowest priority; for now an elapsed window simply re-masks.
 */

/** Length of the granted glimpse, in seconds (5 minutes). */
export const VISIBLE_SECONDS = 300
/** Price of the Initial Pack, surfaced only at the code prompt / pack page. */
export const PRICE_LABEL = '$12'
/** Estimated fulfilment time, for honest disclosure copy + waiting-period comms. */
export const FULFILL_WEEKS_EST = 4

const START_KEY = 'putopia_access_started_at'
const PENDING_EMAIL_KEY = 'putopia_pending_email'

/** Epoch ms when the current window was opened, or null if never opened. */
export function getAccessStartedAt(): number | null {
  try {
    const raw = localStorage.getItem(START_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Open (or re-open) the viewing window, anchored at `now`. */
export function startAccessWindow(now: number = Date.now()): void {
  try {
    localStorage.setItem(START_KEY, String(now))
  } catch {
    /* localStorage unavailable (private mode / quota) — window just won't persist */
  }
}

/** Whole seconds left in the window (0 when none active). */
export function getRemainingSeconds(now: number = Date.now()): number {
  const start = getAccessStartedAt()
  if (start === null) return 0
  const elapsed = (now - start) / 1000
  return Math.max(0, Math.ceil(VISIBLE_SECONDS - elapsed))
}

/** True while a viewing window is open. */
export function isWindowActive(now: number = Date.now()): boolean {
  return getRemainingSeconds(now) > 0
}

/** Email a guest left during onboarding (drives the "Open email" vs "Get permanent access" split). */
export function getPendingEmail(): string | null {
  try {
    return localStorage.getItem(PENDING_EMAIL_KEY)
  } catch {
    return null
  }
}
