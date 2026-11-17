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
  it('offers no claim on a Search batch, with or without an entitlement', () => {
    const inventory = { listingQuantity: 50, claimedQuantity: 0 }
    expect(deviceClaimState(eligible, inventory, 'searching')).toBe('searching')
    expect(deviceClaimState({ ...eligible, status: 'guest', consoleClaim: { eligible: false, claimed: false, href: null } }, inventory, 'searching')).toBe('searching')
    expect(deviceClaimState({ ...eligible, status: 'unknown' }, inventory, 'searching')).toBe('searching')
  })
  it('keeps an existing claim on a Search batch showing as claimed', () => {
    expect(deviceClaimState({ ...eligible, consoleClaim: { ...eligible.consoleClaim, claimed: true } }, undefined, 'searching')).toBe('claimed')
  })
  it('leaves Claim and later stages to the entitlement and inventory checks', () => {
    expect(deviceClaimState(eligible, { listingQuantity: 50, claimedQuantity: 12 }, 'claiming')).toBe('claim')
    expect(deviceClaimState(eligible, { listingQuantity: 50, claimedQuantity: 50 }, 'pack_one')).toBe('waiting_for_capacity')
    expect(deviceClaimState({ ...eligible, status: 'guest', consoleClaim: { eligible: false, claimed: false, href: null } }, undefined, 'claiming')).toBe('explain_initiation')
  })
})
