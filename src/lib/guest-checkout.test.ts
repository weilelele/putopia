import { describe, expect, it } from 'vitest'
import { guestClaimNotice, guestEmailOutcome, guestSeatConflict, normalizeGuestEmail } from './guest-checkout'

describe('normalizeGuestEmail', () => {
  it('trims and lower-cases a plausible address', () => {
    expect(normalizeGuestEmail('  Ada@Example.COM ')).toBe('ada@example.com')
  })
  it('rejects missing, malformed and oversized input', () => {
    expect(normalizeGuestEmail(undefined)).toBeNull()
    expect(normalizeGuestEmail('ada@example')).toBeNull()
    expect(normalizeGuestEmail('ada example@x.com')).toBeNull()
    expect(normalizeGuestEmail(`${'a'.repeat(250)}@x.com`)).toBeNull()
  })
})

describe('guestEmailOutcome', () => {
  it('reports a sent confirmation when there is no error', () => {
    expect(guestEmailOutcome(null)).toBe('sent')
  })
  it('separates an existing account from rate limits and other failures', () => {
    expect(guestEmailOutcome({ code: 'email_exists', status: 422 })).toBe('exists')
    expect(guestEmailOutcome({ code: 'over_email_send_rate_limit', status: 429 })).toBe('rate_limited')
    expect(guestEmailOutcome({ status: 500 })).toBe('failed')
  })
})

describe('guestSeatConflict', () => {
  it('flags an anonymous buyer whose email belongs to another seat holder', () => {
    expect(guestSeatConflict({ id: 'anon', anonymous: true }, ['member'])).toBe(true)
  })
  it('never flags a registered buyer or the buyer’s own seat', () => {
    expect(guestSeatConflict({ id: 'member', anonymous: false }, ['other'])).toBe(false)
    expect(guestSeatConflict({ id: 'anon', anonymous: true }, ['anon'])).toBe(false)
    expect(guestSeatConflict({ id: 'anon', anonymous: true }, [])).toBe(false)
  })
})

describe('guestClaimNotice', () => {
  it('maps every claim route outcome to a message', () => {
    for (const code of ['transferred', 'released', 'seat_owned', 'needs_support', 'nothing', 'expired', 'failed']) {
      expect(guestClaimNotice(code)?.message).toBeTruthy()
    }
  })
  it('ignores unknown and inherited keys', () => {
    expect(guestClaimNotice('toString')).toBeNull()
    expect(guestClaimNotice('anything')).toBeNull()
    expect(guestClaimNotice(undefined)).toBeNull()
  })
})
