import { describe, expect, it } from 'vitest'
import { isStripeSecretKey, isStripeSessionModeMismatch } from './stripe'

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

describe('checkout mode changes', () => {
  it('detects old live checkouts with test keys and old test checkouts with live keys', () => {
    expect(isStripeSessionModeMismatch('cs_live_example', 'sk_test_example')).toBe(true)
    expect(isStripeSessionModeMismatch('cs_test_example', 'rk_live_example')).toBe(true)
  })
  it('allows matching modes and leaves unknown formats to Stripe verification', () => {
    expect(isStripeSessionModeMismatch('cs_test_example', 'sk_test_example')).toBe(false)
    expect(isStripeSessionModeMismatch('cs_live_example', 'rk_live_example')).toBe(false)
    expect(isStripeSessionModeMismatch('cs_unknown', 'sk_test_example')).toBe(false)
    expect(isStripeSessionModeMismatch('cs_live_example', undefined)).toBe(false)
  })
})
