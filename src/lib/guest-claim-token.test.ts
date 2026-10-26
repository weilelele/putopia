import { describe, expect, it } from 'vitest'
import { GUEST_CLAIM_TTL_SECONDS, signGuestClaim, verifyGuestClaim } from './guest-claim-token'

const KEY = 'test-key'
const USER = '0f8fad5b-d9cb-469f-a165-70867728950e'
const NOW = 1_800_000_000

describe('guest claim token', () => {
  it('round-trips the anonymous user id until it expires', () => {
    const token = signGuestClaim(USER, NOW, KEY)
    expect(verifyGuestClaim(token, NOW + 60, KEY)).toBe(USER)
    expect(verifyGuestClaim(token, NOW + GUEST_CLAIM_TTL_SECONDS, KEY)).toBeNull()
  })

  it('rejects tokens signed with another key or edited in transit', () => {
    const token = signGuestClaim(USER, NOW, KEY)
    expect(verifyGuestClaim(token, NOW, 'other-key')).toBeNull()
    const other = '1b4e28ba-2fa1-11d2-883f-0016d3cca427'
    expect(verifyGuestClaim(token.replace(USER, other), NOW, KEY)).toBeNull()
    const [id, expires, mac] = token.split('.')
    expect(verifyGuestClaim(`${id}.${Number(expires) + 9999}.${mac}`, NOW, KEY)).toBeNull()
  })

  it('rejects missing and malformed input', () => {
    expect(verifyGuestClaim(undefined, NOW, KEY)).toBeNull()
    expect(verifyGuestClaim('', NOW, KEY)).toBeNull()
    expect(verifyGuestClaim('not-a-uuid.1.x', NOW, KEY)).toBeNull()
    expect(verifyGuestClaim(`${signGuestClaim(USER, NOW, KEY)}.extra`, NOW, KEY)).toBeNull()
  })
})
