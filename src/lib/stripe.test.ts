import { describe, expect, it } from 'vitest'
import { isStripeSecretKey } from './stripe'

describe('Stripe configuration validation', () => {
  it('accepts live, test, and restricted secret-key shapes', () => {
    expect(isStripeSecretKey('sk_live_example123')).toBe(true)
    expect(isStripeSecretKey('sk_test_example123')).toBe(true)
    expect(isStripeSecretKey('rk_live_example123')).toBe(true)
  })

  it('rejects placeholders and publishable keys', () => {
    expect(isStripeSecretKey(undefined)).toBe(false)
    expect(isStripeSecretKey('placeholder')).toBe(false)
    expect(isStripeSecretKey('pk_live_example123')).toBe(false)
  })
})
