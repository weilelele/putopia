import { describe, expect, it } from 'vitest'
import {
  DEVICE_ORDER_PRODUCT_TYPE,
  formatStripeMinorUnits,
  getDeviceCheckoutDetails,
  isCheckoutAmountValid,
  toStripeMinorUnits,
} from './device-checkout'

describe('device checkout pricing', () => {
  it('uses the selected batch price as Stripe minor units', () => {
    const result = getDeviceCheckoutDetails('cairo-batch-01')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.details.amount).toBe(36_000)
    expect(result.details.currency).toBe('usd')
    expect(result.details.batch.code).toBe('CAIRO-BATCH-01')
    expect(DEVICE_ORDER_PRODUCT_TYPE).toBe('device_batch_claim')
  })

  it('rejects batches that are not currently claimable', () => {
    expect(getDeviceCheckoutDetails('gobi-array-07')).toEqual({
      ok: false,
      status: 409,
      error: 'Claims are not open for this batch',
    })
  })

  it('rejects unknown batches', () => {
    expect(getDeviceCheckoutDetails('missing')).toEqual({
      ok: false,
      status: 404,
      error: 'Batch not found',
    })
  })

  it('handles two-decimal and zero-decimal currencies', () => {
    expect(toStripeMinorUnits(420.5, 'USD')).toBe(42_050)
    expect(toStripeMinorUnits(500, 'jpy')).toBe(500)
    expect(formatStripeMinorUnits(36_000, 'usd')).toBe('$360.00')
    expect(formatStripeMinorUnits(1_200, 'jpy')).toBe('¥1,200')
    expect(() => toStripeMinorUnits(500.5, 'JPY')).toThrow(
      'JPY does not support fractional amounts',
    )
  })

  it('rejects invalid prices before Stripe is called', () => {
    expect(() => toStripeMinorUnits(0, 'usd')).toThrow('greater than zero')
    expect(() => toStripeMinorUnits(10.001, 'usd')).toThrow('two decimal places')
    expect(() => toStripeMinorUnits(10, 'dollars')).toThrow('three-letter ISO code')
  })

  it('reconciles device prices exactly while preserving Pack promotion codes', () => {
    expect(isCheckoutAmountValid(DEVICE_ORDER_PRODUCT_TYPE, 36_000, 36_000)).toBe(true)
    expect(isCheckoutAmountValid(DEVICE_ORDER_PRODUCT_TYPE, 36_000, 35_999)).toBe(false)
    expect(isCheckoutAmountValid('voyager_pack', 1_200, 900)).toBe(true)
    expect(isCheckoutAmountValid('voyager_pack', 1_200, 1_201)).toBe(false)
  })
})
