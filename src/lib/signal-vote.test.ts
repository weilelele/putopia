import { describe, expect, it } from 'vitest'
import { formatTimeLeft, voteCta } from './signal-vote'

const base = { loggedIn: true, canRespond: true, closed: false, initiatorOnly: false, mySelection: null, selectedNumber: null }

describe('voteCta', () => {
  it('lets a guest press the button and prompts sign-up', () => {
    const cta = voteCta({ ...base, loggedIn: false, canRespond: false })
    expect(cta).toMatchObject({ disabled: false, promptAuth: true })
    expect(voteCta({ ...base, loggedIn: false, canRespond: false, selectedNumber: 3 }).label).toBe('CONFIRM SIGNAL 03')
  })
  it('asks a member to select first, then confirms the chosen signal', () => {
    expect(voteCta(base)).toMatchObject({ label: 'SELECT A SIGNAL', disabled: true })
    expect(voteCta({ ...base, selectedNumber: 2 })).toMatchObject({ label: 'CONFIRM SIGNAL 02', disabled: false, promptAuth: false })
  })
  it('shows recorded and closed states as disabled', () => {
    expect(voteCta({ ...base, mySelection: 'a' })).toMatchObject({ label: 'SIGNAL RECORDED', disabled: true })
    expect(voteCta({ ...base, closed: true })).toMatchObject({ label: 'VOTE CLOSED', disabled: true })
  })
  it('explains why a logged-in member cannot vote', () => {
    expect(voteCta({ ...base, canRespond: false })).toMatchObject({ label: 'NOT AVAILABLE', disabled: true })
    expect(voteCta({ ...base, canRespond: false, initiatorOnly: true }).hint).toMatch(/original submitter/)
  })
  it('lets the original submitter continue a vote that ended without responses', () => {
    expect(voteCta({ ...base, initiatorOnly: true, selectedNumber: 1 })).toMatchObject({ disabled: false, label: 'CONFIRM SIGNAL 01' })
  })
})

describe('formatTimeLeft', () => {
  const now = Date.parse('2026-10-06T00:00:00Z')
  it('formats hours, minutes and days', () => {
    expect(formatTimeLeft('2026-10-07T07:30:00Z', now)).toBe('31H LEFT')
    expect(formatTimeLeft('2026-10-06T00:45:00Z', now)).toBe('45M LEFT')
    expect(formatTimeLeft('2026-10-10T00:00:00Z', now)).toBe('4D LEFT')
  })
  it('handles past, missing and invalid times', () => {
    expect(formatTimeLeft('2026-10-05T00:00:00Z', now)).toBe('CLOSING')
    expect(formatTimeLeft(null, now)).toBeNull()
    expect(formatTimeLeft('nope', now)).toBeNull()
  })
})
