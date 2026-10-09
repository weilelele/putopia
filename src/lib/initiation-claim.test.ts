import { describe, expect, it } from 'vitest'
import { initiationClaimResult } from './initiation-claim'

describe('Device claim server response protocol', () => {
  it('rejects mismatched requested supply without claiming another batch', () => {
    expect(initiationClaimResult(null, 'P1003')).toMatchObject({ code: 'unavailable' })
    expect(initiationClaimResult(null, 'P1003').orderId).toBeUndefined()
  })
  it('reports exhausted capacity without claiming a queue enrollment or success', () => {
    const result = initiationClaimResult(null, 'P1002')
    expect(result.code).toBe('waiting_for_capacity')
    expect(result.error).toContain('entitlement is preserved')
    expect(result.orderId).toBeUndefined()
  })
  it('returns the same existing record on repeated claims', () => {
    const result = initiationClaimResult({ already: true, orderId: 'existing-order' })
    expect(result).toMatchObject({ code: 'already_claimed', error: null, orderId: 'existing-order' })
  })
  it('does not grant a Console to legacy/gift/role-only users', () => {
    expect(initiationClaimResult(null, 'P1001').code).toBe('ineligible')
  })
  it('requires a database success record even without an error', () => {
    expect(initiationClaimResult(null).code).toBe('unavailable')
    expect(initiationClaimResult({ orderId: 'new-order', unitCode: 'S26-001' })).toMatchObject({ code: 'claimed', orderId: 'new-order', unitCode: 'S26-001', error: null })
  })
})
