/** USD minor units. Historical receipts retain their original pricing version. */
export const INITIATION_PRICING_VERSION = 'voyager-bundles-v1'
export const MEMBERSHIP_PRICING_VERSION = 'voyager-membership-v1'
export const VOYAGER_MEMBERSHIP_AMOUNT = 1200
export type InitiationOrderKind = 'membership' | 'initial' | 'standard' | 'legacy_upgrade'
export const INITIATION_PRICES = {
  membership: { name: 'Voyager Membership', amount: VOYAGER_MEMBERSHIP_AMOUNT, packs: [] },
  initial: { name: 'Initial Voyager Pack', amount: 3800, priceEnv: 'STRIPE_INITIATION_INITIAL_PRICE_ID', packs: [1, 2] },
  standard: { name: 'Complete Voyager Pack', amount: 48800, priceEnv: 'STRIPE_INITIATION_PRICE_ID', packs: [1, 2, 3, 4] },
  legacy_upgrade: { name: 'Console + Pack 4', amount: 46000, priceEnv: 'STRIPE_INITIATION_UPGRADE_PRICE_ID', packs: [3, 4] },
} as const
export const INITIATION_AMOUNT = INITIATION_PRICES.standard.amount
export const INITIATION_UPGRADE_AMOUNT = INITIATION_PRICES.legacy_upgrade.amount
export const INITIAL_PACK_AMOUNT = INITIATION_PRICES.initial.amount
export const initiationPriceLabel = (kind: InitiationOrderKind) => `$${INITIATION_PRICES[kind].amount / 100}`

export const initialPackPriceLabel = initiationPriceLabel('initial')

export function isInitiationOrderAmount(order: { order_kind: string; amount: number; pricing_version?: string | null; membership_order_id?: string | null }) {
  if (order.pricing_version === MEMBERSHIP_PRICING_VERSION) {
    return order.order_kind === 'membership'
      ? order.amount === VOYAGER_MEMBERSHIP_AMOUNT && !order.membership_order_id
      : !!order.membership_order_id && ((order.order_kind === 'initial' && order.amount === 2600)
        || (order.order_kind === 'standard' && order.amount === 47600))
  }
  if (order.pricing_version === INITIATION_PRICING_VERSION) {
    return order.order_kind !== 'membership' && Object.hasOwn(INITIATION_PRICES, order.order_kind)
      && order.amount === INITIATION_PRICES[order.order_kind as InitiationOrderKind].amount
  }
  // Only pre-migration orders have no version. Never reinterpret their receipts.
  return order.pricing_version == null && ((order.order_kind === 'standard' && order.amount === 52000)
    || (order.order_kind === 'legacy_upgrade' && order.amount === 40000))
}
