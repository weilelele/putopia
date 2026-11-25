import { describe, expect, it } from 'vitest'
import { observationEventName, parseShopifyObservationFailure, shopifyObservationRejection } from './shopify-observation-health'

describe('unbound observation health', () => {
  it('projects only fixed health categories and never claims an order or identity', () => {
    expect(parseShopifyObservationFailure({ event: 'putopia_observation_failed', pixel_version: 3,
      reference: 'private-signature', order_id: 'forged', email: 'private@example.com',
      properties: { reason: 'missing_reference', observed_event: 'checkout_started', message: 'private' } }))
      .toEqual({ reason: 'missing_reference', observedEvent: 'checkout_started' })
  })
  it('does not accept client assertions of server-side binding or transaction failures', () => {
    for (const properties of [{ reason: 'reference_mismatch', observed_event: 'checkout_started' },
      { reason: 'missing_reference', observed_event: 'initiation_purchase_completed' },
      { reason: 'private', observed_event: 'checkout_started' }]) {
      expect(parseShopifyObservationFailure({ event: 'putopia_observation_failed', pixel_version: 3, properties })).toBeNull()
    }
    expect(observationEventName({ event: 'private-error-text' })).toBe('unknown')
  })
  it('distinguishes malformed binding from rejected event time without retaining either value', () => {
    const now = Date.parse('2026-11-23T19:20:00Z')
    expect(shopifyObservationRejection({}, now)).toBe('missing_reference')
    expect(shopifyObservationRejection({ reference: 'private' }, now)).toBe('invalid_reference')
    expect(shopifyObservationRejection({ reference: 'a'.repeat(8) + '-aaaa-4aaa-8aaa-' + 'a'.repeat(12) + '.' + 'b'.repeat(64),
      timestamp: '2026-11-21T19:20:00Z' }, now)).toBe('event_time_rejected')
  })
})
