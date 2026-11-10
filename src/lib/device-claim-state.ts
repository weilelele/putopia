import type { InitiationSnapshot } from './initiation-types'
import type { DeviceSupplyStatus } from './device-supply-model'
import { canClaimDeviceBatch, type BatchInventory, type DeviceBatchStatus } from './device-batches'

export type DeviceClaimAccess = Pick<InitiationSnapshot, 'status' | 'consoleClaim' | 'legacyPackPurchased'> & { supplyStatus?: DeviceSupplyStatus }

/** Display state only. The claim action repeats entitlement, phase and inventory checks. */
export function deviceClaimState(access: DeviceClaimAccess, inventory?: BatchInventory, batchStatus?: DeviceBatchStatus) {
  if (access.consoleClaim.claimed) return 'claimed'
  // No access or supply result can open a batch that is still being searched.
  if (batchStatus && !canClaimDeviceBatch(batchStatus)) return 'searching'
  if (access.status === 'unknown') return 'unknown'
  if (!access.consoleClaim.eligible) return 'explain_initiation'
  if (access.supplyStatus === 'unconfigured') return 'unconfigured'
  if (access.supplyStatus === 'unknown') return 'unknown'
  if (access.supplyStatus === 'full') return 'waiting_for_capacity'
  if (inventory && inventory.claimedQuantity >= inventory.listingQuantity) return 'waiting_for_capacity'
  return 'claim'
}
