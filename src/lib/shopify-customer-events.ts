export const shopifyCheckoutStages = {
  checkout_started: 'initiation_checkout_viewed',
  checkout_contact_info_submitted: 'initiation_checkout_contact_submitted',
  checkout_address_info_submitted: 'initiation_checkout_address_submitted',
  checkout_shipping_info_submitted: 'initiation_checkout_shipping_submitted',
  payment_info_submitted: 'initiation_checkout_payment_submitted',
  checkout_completed: 'initiation_checkout_completed_viewed',
} as const

export type ShopifyCheckoutStage = typeof shopifyCheckoutStages[keyof typeof shopifyCheckoutStages]

export function parseShopifyCustomerEvent(value: unknown, now: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (typeof input.reference !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.[0-9a-f]{64}$/i.test(input.reference)
    || typeof input.event !== 'string' || !Object.hasOwn(shopifyCheckoutStages, input.event)
    || typeof input.timestamp !== 'string') return null
  const time = Date.parse(input.timestamp)
  if (!Number.isFinite(time) || time > now + 60000 || time < now - 86400000) return null
  return { reference: input.reference, orderId: input.reference.slice(0, 36), timestamp: new Date(time).toISOString(),
    event: shopifyCheckoutStages[input.event as keyof typeof shopifyCheckoutStages] }
}
