import { describe, expect, it } from 'vitest'
import {
  getAllowedDeviceOrderStatuses,
  validateDeviceOrderFulfillmentUpdate,
} from './device-order-status'

describe('device order fulfillment transitions', () => {
  it('allows the normal fulfillment progression', () => {
    expect(getAllowedDeviceOrderStatuses('paid')).toEqual([
      'paid',
      'preparing',
      'refunded',
    ])
    expect(getAllowedDeviceOrderStatuses('preparing')).toEqual([
      'preparing',
      'paid',
      'shipped',
      'refunded',
    ])
    expect(getAllowedDeviceOrderStatuses('shipped')).toEqual([
      'shipped',
      'delivered',
      'refunded',
    ])
  })

  it('keeps payment and terminal states locked for manual fulfillment', () => {
    expect(getAllowedDeviceOrderStatuses('pending')).toEqual(['pending'])
    expect(getAllowedDeviceOrderStatuses('payment_review')).toEqual([
      'payment_review',
    ])
    expect(getAllowedDeviceOrderStatuses('refunded')).toEqual(['refunded'])
  })

  it('rejects unsafe jumps and requires tracking before shipment', () => {
    expect(
      validateDeviceOrderFulfillmentUpdate('paid', 'delivered', 'TRACK-1'),
    ).toBe('Cannot move a Device Batch order from paid to delivered.')
    expect(
      validateDeviceOrderFulfillmentUpdate('preparing', 'shipped', null),
    ).toBe('A tracking number is required before marking an order shipped.')
    expect(
      validateDeviceOrderFulfillmentUpdate('preparing', 'shipped', 'TRACK-1'),
    ).toBeNull()
  })
})
