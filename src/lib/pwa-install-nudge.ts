export const PWA_INSTALL_NUDGE_STORAGE_KEY = 'multiverse:pwa-install-nudge:v1'
export const PWA_INSTALL_NUDGE_DEFER_MS = 7 * 24 * 60 * 60 * 1000
export const PWA_INSTALL_NUDGE_DECLINE_MS = 30 * 24 * 60 * 60 * 1000

export type PwaInstallNudgeSource = 'engaged_dashboard' | 'return_dashboard'

export interface PwaInstallNudgeState {
  dashboardVisits: number
  deferUntil: number | null
  installed: boolean
}

export const EMPTY_PWA_INSTALL_NUDGE_STATE: PwaInstallNudgeState = {
  dashboardVisits: 0,
  deferUntil: null,
  installed: false,
}

export function parsePwaInstallNudgeState(value: string | null): PwaInstallNudgeState {
  if (!value) return { ...EMPTY_PWA_INSTALL_NUDGE_STATE }

  try {
    const parsed = JSON.parse(value) as Partial<PwaInstallNudgeState>
    return {
      dashboardVisits: Number.isFinite(parsed.dashboardVisits) && parsed.dashboardVisits! > 0
        ? Math.floor(parsed.dashboardVisits!)
        : 0,
      deferUntil: Number.isFinite(parsed.deferUntil) ? parsed.deferUntil! : null,
      installed: parsed.installed === true,
    }
  } catch {
    return { ...EMPTY_PWA_INSTALL_NUDGE_STATE }
  }
}

export function getPwaInstallNudgeSource(state: PwaInstallNudgeState): PwaInstallNudgeSource {
  return state.dashboardVisits > 0 ? 'return_dashboard' : 'engaged_dashboard'
}

export function shouldShowPwaInstallNudge({
  state,
  now,
  eligible,
  engaged,
  source,
}: {
  state: PwaInstallNudgeState
  now: number
  eligible: boolean
  engaged: boolean
  source: PwaInstallNudgeSource
}) {
  if (!eligible) return false
  if (state.installed) return false
  if (state.deferUntil && state.deferUntil > now) return false
  return source === 'return_dashboard' || engaged
}

export function recordPwaInstallNudgeVisit(state: PwaInstallNudgeState): PwaInstallNudgeState {
  return { ...state, dashboardVisits: state.dashboardVisits + 1 }
}

export function deferPwaInstallNudge(
  state: PwaInstallNudgeState,
  now: number,
  durationMs: number,
): PwaInstallNudgeState {
  return { ...state, deferUntil: now + durationMs }
}

export function markPwaInstallNudgeInstalled(state: PwaInstallNudgeState): PwaInstallNudgeState {
  return { ...state, installed: true, deferUntil: null }
}

export function readPwaInstallNudgeState(): PwaInstallNudgeState {
  try {
    return parsePwaInstallNudgeState(localStorage.getItem(PWA_INSTALL_NUDGE_STORAGE_KEY))
  } catch {
    return { ...EMPTY_PWA_INSTALL_NUDGE_STATE }
  }
}

export function writePwaInstallNudgeState(state: PwaInstallNudgeState) {
  try {
    localStorage.setItem(PWA_INSTALL_NUDGE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private browsing or storage restrictions should never block installation.
  }
}

export function markStoredPwaInstallNudgeInstalled() {
  const state = markPwaInstallNudgeInstalled(readPwaInstallNudgeState())
  writePwaInstallNudgeState(state)
}
