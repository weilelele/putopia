import { describe, expect, it } from 'vitest'
import { initiationMemberStatus, parseInitiationAvailability } from './initiation-membership'
describe('explicit Initiation roster and paid entitlements', () => {
  it('recognizes granted NPC membership without inventing payment entitlement', () => expect(initiationMemberStatus(false, { source: 'granted', active: true }, false)).toBe('granted'))
  it('does not infer membership from missing roster or historical Pack', () => {
    expect(initiationMemberStatus(false, null, false)).toBe('unpaid')
    expect(initiationMemberStatus(false, null, true)).toBe('legacy_pack')
  })
  it('requires actual paid entitlement for initiated fulfillment status', () => {
    expect(initiationMemberStatus(true, { source: 'paid', active: true }, false)).toBe('initiated')
    expect(initiationMemberStatus(false, { source: 'paid', active: true }, false)).toBe('unknown')
    expect(initiationMemberStatus(false, { source: 'paid', active: false }, false)).toBe('unpaid')
  })
})
describe('shared S26 capacity response', () => {
  const supply = { open: false, capacity: 100, initiated: 1, remaining: 99, paid: 0, granted: 1 }
  it('accepts the verified one-grant, no-payments response', () => expect(parseInitiationAvailability(supply)).toEqual(supply))
  it('allows reserved seats without calling them initiated', () => expect(parseInitiationAvailability({ ...supply, remaining: 98 })).not.toBeNull())
  it.each([{ initiated: 0 }, { paid: 1 }, { remaining: 100 }, { remaining: -1 }, { capacity: 101 }, { initiated: null }, { open: 'false' }])('rejects inconsistent or unknown supply %j', change => expect(parseInitiationAvailability({ ...supply, ...change })).toBeNull())
})
