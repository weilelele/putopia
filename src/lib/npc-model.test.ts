import { describe, expect, it } from 'vitest'
import { canSpeakAsNpc, validateNpcProfile } from './npc-model'

const profile = { displayName: 'Mira', role: 'voyager' as const, bio: 'An official character.', avatarUrl: '', location: 'Kyoto' }

describe('NPC profile input', () => {
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
