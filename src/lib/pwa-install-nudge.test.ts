import { describe, expect, it } from 'vitest'
import {
  EMPTY_PWA_INSTALL_NUDGE_STATE,
  PWA_INSTALL_NUDGE_DECLINE_MS,
  PWA_INSTALL_NUDGE_DEFER_MS,
  deferPwaInstallNudge,
  getPwaInstallNudgeSource,
  markPwaInstallNudgeInstalled,
  parsePwaInstallNudgeState,
  recordPwaInstallNudgeVisit,
  shouldShowPwaInstallNudge,
} from '@/lib/pwa-install-nudge'

const now = 1_750_000_000_000

describe('PWA install nudge eligibility', () => {
  it('requires an eligible user and meaningful dashboard engagement on their first visit', () => {
    expect(shouldShowPwaInstallNudge({
      state: EMPTY_PWA_INSTALL_NUDGE_STATE,
      now,
      eligible: true,
      engaged: false,
      source: 'engaged_dashboard',
    })).toBe(false)

    expect(shouldShowPwaInstallNudge({
      state: EMPTY_PWA_INSTALL_NUDGE_STATE,
      now,
      eligible: true,
      engaged: true,
      source: 'engaged_dashboard',
    })).toBe(true)

    expect(shouldShowPwaInstallNudge({
      state: EMPTY_PWA_INSTALL_NUDGE_STATE,
      now,
      eligible: false,
      engaged: true,
      source: 'engaged_dashboard',
    })).toBe(false)
  })

  it('allows a return dashboard visit without requiring a new scroll threshold', () => {
    const state = recordPwaInstallNudgeVisit(EMPTY_PWA_INSTALL_NUDGE_STATE)
    expect(getPwaInstallNudgeSource(state)).toBe('return_dashboard')
    expect(shouldShowPwaInstallNudge({ state, now, eligible: true, engaged: false, source: 'return_dashboard' })).toBe(true)
  })

  it('suppresses a deferred nudge for 7 days and a native decline for 30 days', () => {
    const deferred = deferPwaInstallNudge(EMPTY_PWA_INSTALL_NUDGE_STATE, now, PWA_INSTALL_NUDGE_DEFER_MS)
    expect(shouldShowPwaInstallNudge({ state: deferred, now: now + PWA_INSTALL_NUDGE_DEFER_MS - 1, eligible: true, engaged: true, source: 'engaged_dashboard' })).toBe(false)
    expect(shouldShowPwaInstallNudge({ state: deferred, now: now + PWA_INSTALL_NUDGE_DEFER_MS, eligible: true, engaged: true, source: 'engaged_dashboard' })).toBe(true)

    const declined = deferPwaInstallNudge(EMPTY_PWA_INSTALL_NUDGE_STATE, now, PWA_INSTALL_NUDGE_DECLINE_MS)
    expect(shouldShowPwaInstallNudge({ state: declined, now: now + PWA_INSTALL_NUDGE_DEFER_MS, eligible: true, engaged: true, source: 'engaged_dashboard' })).toBe(false)
  })

  it('never shows after a successful installation and safely handles stale storage', () => {
    const installed = markPwaInstallNudgeInstalled(EMPTY_PWA_INSTALL_NUDGE_STATE)
    expect(shouldShowPwaInstallNudge({ state: installed, now, eligible: true, engaged: true, source: 'engaged_dashboard' })).toBe(false)
    expect(parsePwaInstallNudgeState('{invalid json')).toEqual(EMPTY_PWA_INSTALL_NUDGE_STATE)
  })
})
