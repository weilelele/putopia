import { describe, expect, it } from 'vitest'
import {
  formatBatchPrice,
  formatDeviceBatchLocalTime,
  getBatchAvailability,
  getBatchClaimHref,
  getBatchRemainingQuantity,
  getDeviceBatchTimeZone,
  isValidDeviceBatchTimeZone,
} from './device-batches'
import { getDeviceBatch } from './__fixtures__/device-batches'

describe('device batch pricing', () => {
  const cairoBatch = getDeviceBatch('cairo-batch-01')

  it('stores one price on the selected batch', () => {
    expect(cairoBatch).toBeDefined()
    expect(cairoBatch!.claimPrice?.amount).toBe(360)
  })

  it('formats configured amounts and currencies', () => {
    expect(formatBatchPrice(cairoBatch!.claimPrice!)).toBe('$360 USD')
    expect(
      formatBatchPrice({
        amount: 420.5,
        currency: 'usd',
        description: '',
      }),
    ).toBe('$420.50 USD')
    expect(
      formatBatchPrice({
        amount: 100,
        currency: '',
        description: '',
      }),
    ).toBe('100 ---')
  })

  it('builds a claim URL that identifies only the batch', () => {
    expect(getBatchClaimHref(cairoBatch!)).toBe('/devices/claim?batch=cairo-batch-01')
  })

  it('derives customer-facing availability from structured inventory', () => {
    expect(getBatchAvailability(cairoBatch!)).toBe('42 of 64 units secured')
    expect(getBatchRemainingQuantity(cairoBatch!)).toBe(22)
  })
})

describe('device batch local time', () => {
  it('formats the clock in the Batch time zone', () => {
    const instant = Date.parse('2026-01-01T00:00:00Z')
    expect(formatDeviceBatchLocalTime('Asia/Tokyo', instant)).toBe('09:00:00')
  })

  it('validates IANA zones and restores zones for legacy Batches', () => {
    expect(isValidDeviceBatchTimeZone('Europe/London')).toBe(true)
    expect(isValidDeviceBatchTimeZone('London time')).toBe(false)
    expect(getDeviceBatchTimeZone({ slug: 'kyoto-relay-02' })).toBe('Asia/Tokyo')
    expect(getDeviceBatchTimeZone({ slug: 'unknown-batch' })).toBe('UTC')
  })
})
