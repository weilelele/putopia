export type DeviceSupplyStatus = 'available' | 'full' | 'unconfigured' | 'unknown'
export function readDeviceSupplyStatus(value: unknown): DeviceSupplyStatus {
  const status = value && typeof value === 'object' && 'status' in value ? value.status : null
  return status === 'available' || status === 'full' || status === 'unconfigured' ? status : 'unknown'
}
export function validateSupplyConfirmation(slug: string | null, confirmation: string, note: string): string | null {
  if (confirmation.trim() !== (slug ?? 'UNLINK')) return 'Type the exact selected batch slug (or UNLINK) to confirm.'
  if (note.trim().length < 10 || note.trim().length > 1000) return 'Add the approval reference and supply review note (10–1000 characters).'
  return null
}
export interface DeviceSupplyOption { slug: string; name: string; publication_status: string; listing_quantity: number; claimed_quantity: number; reserved_quantity: number; availableUnits: number }
export interface ConsoleShipmentRecord { orderId: string; status: string; scheduledMonth: string; trackingUrl: string | null }
