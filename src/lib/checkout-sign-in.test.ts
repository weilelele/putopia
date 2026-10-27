import { describe, expect, it } from 'vitest'
import { normalizeSignInEmail, signInFailure } from './checkout-sign-in'

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

describe('signInFailure', () => {
  it('maps Supabase password errors to dialog messages', () => {
    expect(signInFailure({ code: 'over_request_rate_limit', status: 429 })).toBe('rate_limited')
    expect(signInFailure({ status: 429 })).toBe('rate_limited')
    expect(signInFailure({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' })).toBe('invalid_password')
    expect(signInFailure({ status: 500, message: 'boom' })).toBe('failed')
  })
})
