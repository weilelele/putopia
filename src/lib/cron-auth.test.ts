import { describe, expect, it } from 'vitest'
import { isCronAuthorized } from './cron-auth'

describe('isCronAuthorized', () => {
  it.each([undefined, '', '   '])('rejects an unconfigured secret: %s', (secret) => {
    expect(isCronAuthorized(null, secret)).toBe(false)
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(false)
  })

  it.each([null, '', 'Bearer wrong', 'test-secret'])('rejects invalid authorization: %s', (header) => {
    expect(isCronAuthorized(header, 'test-secret')).toBe(false)
  })

  it('accepts only the configured bearer secret', () => {
    expect(isCronAuthorized('Bearer test-secret', 'test-secret')).toBe(true)
  })
})
