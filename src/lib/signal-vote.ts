/** Pure rules for the Signal Dispatch vote sheet. */

export type VoteCta = {
  label: string
  disabled: boolean
  /** True when pressing the button should open the sign-up prompt instead of voting. */
  promptAuth: boolean
  hint: string
}

export function voteCta(input: {
  loggedIn: boolean
  canRespond: boolean | undefined
  closed: boolean
  initiatorOnly: boolean
  mySelection: string | null
  /** 1-based number of the signal the viewer has highlighted, or null. */
  selectedNumber: number | null
}): VoteCta {
  const nn = input.selectedNumber === null ? null : String(input.selectedNumber).padStart(2, '0')
  if (input.mySelection) {
    return { label: 'SIGNAL RECORDED', disabled: true, promptAuth: false, hint: 'Your signal is in. Voting stays open until the window closes.' }
  }
  if (input.closed) {
    return { label: 'VOTE CLOSED', disabled: true, promptAuth: false, hint: 'This vote has closed.' }
  }
  // Guests can always press: the button explains how to join instead of being disabled.
  if (!input.loggedIn) {
    return { label: nn ? `CONFIRM SIGNAL ${nn}` : 'CONFIRM SIGNAL', disabled: false, promptAuth: true, hint: 'Create a free account to cast your signal.' }
  }
  if (input.initiatorOnly && !input.canRespond) {
    return { label: 'VOTE CLOSED', disabled: true, promptAuth: false, hint: 'Voting ended without responses. Only the original submitter can continue.' }
  }
  if (input.canRespond === false) {
    return { label: 'NOT AVAILABLE', disabled: true, promptAuth: false, hint: 'Voting on this signal is not open to your account.' }
  }
  if (nn === null) {
    return { label: 'SELECT A SIGNAL', disabled: true, promptAuth: false, hint: 'Pick the recording that matches the description best.' }
  }
  return {
    label: `CONFIRM SIGNAL ${nn}`,
    disabled: false,
    promptAuth: false,
    hint: input.initiatorOnly ? 'Voting ended without responses. Only you can choose a signal to start the next round.' : `Signal ${nn} selected.`,
  }
}

/** "31H LEFT" / "45M LEFT" / "CLOSING" from a close timestamp; null when unscheduled. */
export function formatTimeLeft(closeAt: string | null | undefined, now: number): string | null {
  if (!closeAt) return null
  const ms = new Date(closeAt).getTime() - now
  if (Number.isNaN(ms)) return null
  if (ms <= 0) return 'CLOSING'
  const hours = Math.floor(ms / 3_600_000)
  if (hours >= 48) return `${Math.floor(hours / 24)}D LEFT`
  if (hours >= 1) return `${hours}H LEFT`
  return `${Math.max(1, Math.floor(ms / 60_000))}M LEFT`
}
