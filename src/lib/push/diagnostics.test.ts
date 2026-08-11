import { describe, expect, it } from 'vitest'
import { diagnosePushTest } from './diagnostics'

describe('diagnosePushTest', () => {
  it('reports a successful physical delivery', () => {
    expect(diagnosePushTest({ configured: true, attempted: 1, delivered: 1 })).toEqual({
      status: 200,
      message: 'Push delivered to a registered iPhone.',
    })
  })

  it('distinguishes missing storage from a missing device', () => {
    expect(diagnosePushTest({
      configured: true,
      attempted: 0,
      delivered: 0,
      reason: 'storage_unavailable',
    }).status).toBe(503)
    expect(diagnosePushTest({
      configured: true,
      attempted: 0,
      delivered: 0,
      reason: 'no_registered_devices',
    }).status).toBe(409)
  })

  it('reports a production APNs rejection separately', () => {
    const result = diagnosePushTest({
      configured: true,
      attempted: 1,
      delivered: 0,
      reason: 'provider_rejected',
    })
    expect(result.status).toBe(502)
    expect(result.nextStep).toContain('production APNs entitlement')
  })
})
