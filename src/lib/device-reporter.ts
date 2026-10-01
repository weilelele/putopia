import type { DeviceConsoleRecord } from '@/lib/actions/orders'

/**
 * "Has device" status for Worlds reporting. It is true when either
 *  - the user actually received a device (a delivered device order matched to a
 *    unit), or
 *  - the back office granted it (a device_access_grants row).
 * NPC batch allocation is separate: it configures devices, not this status.
 */
export type DeviceStatus = { has: boolean; source: 'purchase' | 'granted' | null }

export function canReportFromConsoles(consoles: Pick<DeviceConsoleRecord, 'order'>[]): boolean {
  return consoles.some((record) => record.order.status === 'delivered')
}

export function resolveDeviceStatus(input: {
  granted: boolean
  consoles: Pick<DeviceConsoleRecord, 'order'>[]
}): DeviceStatus {
  if (canReportFromConsoles(input.consoles)) return { has: true, source: 'purchase' }
  if (input.granted) return { has: true, source: 'granted' }
  return { has: false, source: null }
}
