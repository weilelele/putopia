import { describe, expect, it } from 'vitest'
import { deviceClaimState, type DeviceClaimAccess } from './device-claim-state'

const eligible: DeviceClaimAccess = { status: 'initiated', legacyPackPurchased: false, consoleClaim: { eligible: true, claimed: false, href: '/devices/claim' } }

describe('Device claim states', () => {
  it('allows a verified entitlement to request server allocation', () => {
    expect(deviceClaimState(eligible, { listingQuantity: 50, claimedQuantity: 12 })).toBe('claim')
  })
  it('shows capacity waiting without creating a queue or charging again', () => {
    expect(deviceClaimState(eligible, { listingQuantity: 50, claimedQuantity: 50 })).toBe('waiting_for_capacity')
  })
  it('does not confuse unavailable inventory with exhausted inventory', () => {
    expect(deviceClaimState(eligible)).toBe('claim') // The server can return unavailable.
  })
  it('requires explanation and confirmation for legacy Pack owners without entitlement', () => {
    expect(deviceClaimState({ ...eligible, status: 'legacy_pack', legacyPackPurchased: true, consoleClaim: { eligible: false, claimed: false, href: null } })).toBe('explain_initiation')
  })
  it('does not treat failed reads as an invitation to pay', () => {
    expect(deviceClaimState({ ...eligible, status: 'unknown' })).toBe('unknown')
  })
  it('keeps already claimed access even when the batch is full', () => {
    expect(deviceClaimState({ ...eligible, consoleClaim: { ...eligible.consoleClaim, claimed: true } }, { listingQuantity: 50, claimedQuantity: 50 })).toBe('claimed')
  })
})
