import { describe, expect, it } from 'vitest'
import {
  getStripeMode,
  getStripeSessionMode,
  isStripeSecretKey,
  stripeSessionModeMismatch,
} from './stripe'

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

  it('identifies Stripe key and Checkout Session modes', () => {
    expect(getStripeMode('sk_test_example123')).toBe('test')
    expect(getStripeMode('rk_live_example123')).toBe('live')
    expect(getStripeMode(undefined)).toBeNull()
    expect(getStripeSessionMode('cs_live_example')).toBe('live')
    expect(getStripeSessionMode('cs_test_example')).toBe('test')
    expect(getStripeSessionMode('manual_123')).toBeNull()
  })

  it('detects when a saved Checkout Session belongs to the other Stripe mode', () => {
    expect(stripeSessionModeMismatch('cs_live_example', 'sk_test_example123')).toBe(true)
    expect(stripeSessionModeMismatch('cs_test_example', 'sk_live_example123')).toBe(true)
    expect(stripeSessionModeMismatch('cs_test_example', 'sk_test_example123')).toBe(false)
    expect(stripeSessionModeMismatch('manual_123', 'sk_test_example123')).toBe(false)
  })
})
