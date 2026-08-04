export const DEVICE_ORDER_STATUSES = [
  'pending',
  'payment_review',
  'payment_failed',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'refunded',
  'canceled',
] as const

export type DeviceOrderStatus = (typeof DEVICE_ORDER_STATUSES)[number]

const MANUAL_TRANSITIONS: Record<DeviceOrderStatus, DeviceOrderStatus[]> = {
  pending: ['pending'],
  payment_review: ['payment_review'],
  payment_failed: ['payment_failed'],
  paid: ['paid', 'preparing', 'refunded'],
  preparing: ['preparing', 'paid', 'shipped', 'refunded'],
  shipped: ['shipped', 'delivered', 'refunded'],
  delivered: ['delivered', 'refunded'],
  refunded: ['refunded'],
  canceled: ['canceled'],
}

export function isDeviceOrderStatus(value: string): value is DeviceOrderStatus {
  return DEVICE_ORDER_STATUSES.includes(value as DeviceOrderStatus)
}

export function getAllowedDeviceOrderStatuses(
  currentStatus: string,
): DeviceOrderStatus[] {
  if (!isDeviceOrderStatus(currentStatus)) return []
  return MANUAL_TRANSITIONS[currentStatus]
}

export function validateDeviceOrderFulfillmentUpdate(
  currentStatus: string,
  nextStatus: string,
  trackingNumber: string | null | undefined,
) {
  if (!isDeviceOrderStatus(currentStatus) || !isDeviceOrderStatus(nextStatus)) {
    return 'Unknown Device Batch order status.'
  }
  if (!MANUAL_TRANSITIONS[currentStatus].includes(nextStatus)) {
    return `Cannot move a Device Batch order from ${currentStatus} to ${nextStatus}.`
  }
  if (
    (nextStatus === 'shipped' || nextStatus === 'delivered')
    && !trackingNumber?.trim()
  ) {
    return 'A tracking number is required before marking an order shipped.'
  }
  return null
}
