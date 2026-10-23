import { describe, expect, it } from 'vitest'
import { normalizeEmailCode, normalizeSignInEmail, signInFailure } from './checkout-sign-in'

describe('normalizeSignInEmail', () => {
  it('trims and lower-cases a plausible address', () => {
    expect(normalizeSignInEmail('  Ada@Example.COM ')).toBe('ada@example.com')
  })
  it('rejects missing and malformed input', () => {
    expect(normalizeSignInEmail(undefined)).toBeNull()
    expect(normalizeSignInEmail('ada@example')).toBeNull()
    expect(normalizeSignInEmail('ada example@x.com')).toBeNull()
  })
})

describe('normalizeEmailCode', () => {
  it('accepts 6–10 digits and ignores spaces or dashes', () => {
    expect(normalizeEmailCode('123456')).toBe('123456')
    expect(normalizeEmailCode(' 123 456 ')).toBe('123456')
    expect(normalizeEmailCode('123-456-78')).toBe('12345678')
  })
  it('rejects short, long and non-numeric codes', () => {
    expect(normalizeEmailCode('12345')).toBeNull()
    expect(normalizeEmailCode('12345678901')).toBeNull()
    expect(normalizeEmailCode('12a456')).toBeNull()
  })
})

describe('signInFailure', () => {
  it('separates rate limits, bad codes and bad passwords', () => {
    expect(signInFailure({ code: 'over_email_send_rate_limit', status: 429 })).toBe('rate_limited')
    expect(signInFailure({ status: 429 })).toBe('rate_limited')
    expect(signInFailure({ code: 'otp_expired', status: 403, message: 'Token has expired or is invalid' })).toBe('invalid_code')
    expect(signInFailure({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' })).toBe('invalid_password')
    expect(signInFailure({ status: 500, message: 'boom' })).toBe('failed')
  })
})
