import { describe, expect, it } from 'vitest'
import { canSpeakAsNpc, parseNpcInitiationState, validateNpcRegistration, npcMemberBatchOptions, validateNpcMemberBatch, validateNpcProfile } from './npc-model'

const profile = { displayName: 'Mira', role: 'voyager' as const, bio: 'An official character.', avatarUrl: '', location: 'Kyoto', batchLabel: '2025 Batch', grantNote: '' }

describe('NPC profile input', () => {
  it('requires an explicit batch even for new guest identities', () => {
    for (const batchLabel of ['', '  ', undefined, null, 26, 'x'.repeat(121), 'S26\n']) {
      expect(validateNpcProfile({ ...profile, role: 'guest', batchLabel: batchLabel as string })).not.toBeNull()
    }
  })
  it('offers registered and historical labels without inventing a latest batch', () => {
    const options = npcMemberBatchOptions(['Original Batch', '2026 Batch S2', '2025 Batch', 'Original Batch', ''])
    expect(options).toEqual(['Original Batch', '2026 Batch S2', '2025 Batch'])
    expect(validateNpcMemberBatch('2025 Batch', options)).toBeNull()
    expect(validateNpcMemberBatch('S26', options)).not.toBeNull()
    expect(validateNpcMemberBatch('KYOTO-001', options)).not.toBeNull()
    expect(validateNpcMemberBatch('26', options)).not.toBeNull()
    expect(validateNpcMemberBatch('', [])).not.toBeNull()
  })
  it('accepts a profile without an avatar and rejects blank names', () => {
    expect(validateNpcProfile(profile)).toBeNull()
    expect(validateNpcProfile({ ...profile, displayName: '   ' })).not.toBeNull()
  })
  it('accepts every supported identity type and rejects unknown roles', () => {
    for (const role of ['guest', 'applicant', 'voyager', 'architect'] as const) {
      expect(validateNpcProfile({ ...profile, role })).toBeNull()
    }
    expect(validateNpcProfile({ ...profile, role: 'admin' as never })).toBe('Choose a valid NPC identity type.')
  })
  it('rejects unsafe URL schemes, credentials and oversized descriptions', () => {
    for (const avatarUrl of ['javascript:alert(1)', 'data:image/svg+xml,test', 'http://example.org/a.png', 'https://user:pass@example.org/a.png']) {
      expect(validateNpcProfile({ ...profile, avatarUrl })).not.toBeNull()
    }
    expect(validateNpcProfile({ ...profile, avatarUrl: 'https://example.org/a.png' })).toBeNull()
    expect(validateNpcProfile({ ...profile, bio: 'x'.repeat(2001) })).not.toBeNull()
  })
})

describe('NPC authorship', () => {
  it('requires an administrator, an NPC and an allocated device together', () => {
    for (const admin of [false, true]) for (const npc of [false, true]) for (const holds of [false, true]) {
      expect(canSpeakAsNpc(admin, npc, holds)).toBe(admin && npc && holds)
    }
  })
})

// These remain pure: no database, network or environment access.
describe('S26 NPC registration', () => {
  const empty = { capacity: 100, occupied: 99, member: null }
  const grant = { ...profile, batchLabel: 'S26', grantNote: 'Approved character' }
  it('requires an explicit grant note and member identity', () => {
    expect(validateNpcRegistration(grant, empty)).toBeNull()
    expect(validateNpcRegistration({ ...grant, grantNote: ' ' }, empty)).not.toBeNull()
    expect(validateNpcRegistration({ ...grant, role: 'guest' }, empty)).not.toBeNull()
  })
  it('rejects new grants at or over capacity but permits idempotent registered edits', () => {
    for (const occupied of [100, 101]) {
      expect(validateNpcRegistration(grant, { ...empty, occupied })).not.toBeNull()
      expect(validateNpcRegistration({ ...grant, grantNote: '' }, { ...empty, occupied, member: { batch: 'S26', source: 'granted', active: true } })).toBeNull()
    }
  })
  it('retains inactive seats and forbids implicit exit, demotion and source reconciliation', () => {
    const registered = { ...empty, member: { batch: 'S26', source: 'granted' as const, active: false } }
    expect(validateNpcRegistration(grant, registered)).toBeNull()
    expect(validateNpcRegistration(profile, registered)).not.toBeNull()
    expect(validateNpcRegistration({ ...grant, role: 'applicant' }, registered)).not.toBeNull()
    expect(validateNpcRegistration(grant, { ...registered, member: { ...registered.member, source: 'paid' } })).not.toBeNull()
  })
  it('never interprets malformed or failed reads as an empty roster', () => {
    for (const value of [null, undefined, {}, { ...empty, occupied: null }, { ...empty, member: undefined }, { ...empty, member: {} }, { ...empty, capacity: 0 }]) {
      expect(() => parseNpcInitiationState(value)).toThrow()
    }
    expect(parseNpcInitiationState(empty)).toEqual(empty)
  })
})
