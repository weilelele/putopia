import type { InitiationSnapshot } from './initiation-types'
import type { DeviceSupplyStatus } from './device-supply-model'
import type { BatchInventory } from './device-batches'

export type DeviceClaimAccess = Pick<InitiationSnapshot, 'status' | 'consoleClaim' | 'legacyPackPurchased'> & { supplyStatus?: DeviceSupplyStatus }

/** Display state only. The claim action repeats entitlement and inventory checks. */
export function deviceClaimState(access: DeviceClaimAccess, inventory?: BatchInventory) {
  if (access.consoleClaim.claimed) return 'claimed'
  if (access.status === 'unknown') return 'unknown'
  if (!access.consoleClaim.eligible) return 'explain_initiation'
  if (access.supplyStatus === 'unconfigured') return 'unconfigured'
  if (access.supplyStatus === 'unknown') return 'unknown'
  if (access.supplyStatus === 'full') return 'waiting_for_capacity'
  if (inventory && inventory.claimedQuantity >= inventory.listingQuantity) return 'waiting_for_capacity'
  return 'claim'
}
