/** USD minor units. Historical receipts retain their original pricing version. */
export const INITIATION_PRICING_VERSION = 'voyager-bundles-v1'
export type InitiationOrderKind = 'initial' | 'standard' | 'legacy_upgrade'
export const INITIATION_PRICES = {
  initial: { name: 'Initial Voyager Pack', amount: 3800, priceEnv: 'STRIPE_INITIATION_INITIAL_PRICE_ID', packs: [1, 2] },
  standard: { name: 'Complete Voyager Pack', amount: 48800, priceEnv: 'STRIPE_INITIATION_PRICE_ID', packs: [1, 2, 3, 4] },
  legacy_upgrade: { name: 'Console + Pack 4', amount: 46000, priceEnv: 'STRIPE_INITIATION_UPGRADE_PRICE_ID', packs: [3, 4] },
} as const
export const INITIATION_AMOUNT = INITIATION_PRICES.standard.amount
export const INITIATION_UPGRADE_AMOUNT = INITIATION_PRICES.legacy_upgrade.amount
export const INITIAL_PACK_AMOUNT = INITIATION_PRICES.initial.amount
export const initiationPriceLabel = (kind: InitiationOrderKind) => `$${INITIATION_PRICES[kind].amount / 100}`

export const initialPackPriceLabel = initiationPriceLabel('initial')

export function isInitiationOrderAmount(order: { order_kind: string; amount: number; pricing_version?: string | null }) {
  if (order.pricing_version === INITIATION_PRICING_VERSION) {
    return Object.hasOwn(INITIATION_PRICES, order.order_kind)
      && order.amount === INITIATION_PRICES[order.order_kind as InitiationOrderKind].amount
  }
  // Only pre-migration orders have no version. Never reinterpret their receipts.
  return order.pricing_version == null && ((order.order_kind === 'standard' && order.amount === 52000)
    || (order.order_kind === 'legacy_upgrade' && order.amount === 40000))
}
