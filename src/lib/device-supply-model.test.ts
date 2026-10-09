import { describe,expect,it } from 'vitest'
import { readDeviceSupplyStatus,validateSupplyConfirmation } from './device-supply-model'
import { deviceClaimState,type DeviceClaimAccess } from './device-claim-state'
const paid:DeviceClaimAccess={status:'initiated',consoleClaim:{eligible:true,claimed:false,href:'/devices'},legacyPackPurchased:false}
describe('reviewed equipment supply',()=>{
 it('does not confuse unconfigured supply with exhaustion',()=>{
  expect(deviceClaimState({...paid,supplyStatus:'unconfigured'},{listingQuantity:0,claimedQuantity:0})).toBe('unconfigured')
  expect(deviceClaimState({...paid,supplyStatus:'full'})).toBe('waiting_for_capacity')
  expect(deviceClaimState({...paid,supplyStatus:'unknown'})).toBe('unknown')
 })
 it('keeps legacy Pack without entitlement in the confirmation flow even with capacity',()=>{
  expect(deviceClaimState({...paid,status:'legacy_pack',legacyPackPurchased:true,consoleClaim:{eligible:false,claimed:false,href:null},supplyStatus:'available'})).toBe('explain_initiation')
 })
 it('rejects invented supply responses and missing confirmation',()=>{
  expect(readDeviceSupplyStatus(null)).toBe('unknown')
  expect(readDeviceSupplyStatus({status:'queued'})).toBe('unknown')
  expect(validateSupplyConfirmation('kyoto-one','S26','approved shipment allocation')).not.toBeNull()
  expect(validateSupplyConfirmation('kyoto-one','kyoto-one','')).not.toBeNull()
  expect(validateSupplyConfirmation('kyoto-one','kyoto-one','Reviewed approval reference')).toBeNull()
  expect(validateSupplyConfirmation(null,'UNLINK','Reviewed approval reference')).toBeNull()
 })
})
