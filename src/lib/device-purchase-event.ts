import { toStripeMinorUnits } from './device-checkout'

type PurchaseOrder = {
  id: string
  status: string
  amount: number | null
  currency: string
  device_batch_slug: string | null
}

/** Only webhook-confirmed orders may become browser conversion events. */
export function getDevicePurchaseEvent(order: PurchaseOrder | null) {
  if (!order || !['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)) return null
  if (order.amount == null || !Number.isSafeInteger(order.amount) || order.amount <= 0) return null
  try {
    const currency = order.currency.trim().toUpperCase()
    return {
      eventId: `device_purchase_${order.id}`,
      value: order.amount / toStripeMinorUnits(1, currency),
      currency,
      contentId: order.device_batch_slug ?? 'device',
    }
  } catch {
    return null
  }
}
