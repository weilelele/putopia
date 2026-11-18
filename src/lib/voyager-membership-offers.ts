import { INITIATION_PRICES, VOYAGER_MEMBERSHIP_AMOUNT } from './initiation-pricing'

export { VOYAGER_MEMBERSHIP_AMOUNT } from './initiation-pricing'
export type MembershipOwnership = 'none' | 'membership' | 'initial'
export type MembershipTarget = 'membership' | 'initial' | 'standard'

/** The price ladder used by the Initiation preview. Production must derive ownership from confirmed orders. */
export function membershipOffers(ownership: MembershipOwnership) {
  if (ownership === 'initial') {
    return [{
      target: 'standard' as const, amount: INITIATION_PRICES.legacy_upgrade.amount,
      listAmount: INITIATION_PRICES.legacy_upgrade.amount, credit: 0, packs: [3, 4],
      name: INITIATION_PRICES.legacy_upgrade.name,
    }]
  }

  const physical = (['initial', 'standard'] as const).map(target => {
    const price = INITIATION_PRICES[target]
    const credit = ownership === 'membership' ? VOYAGER_MEMBERSHIP_AMOUNT : 0
    return { target, amount: price.amount - credit, listAmount: price.amount, credit, packs: price.packs, name: price.name }
  })
  return ownership === 'membership' ? physical : [{
    target: 'membership' as const, amount: VOYAGER_MEMBERSHIP_AMOUNT, listAmount: VOYAGER_MEMBERSHIP_AMOUNT,
    credit: 0, packs: [], name: 'Voyager Membership',
  }, ...physical]
}

export const membershipAmountLabel = (cents: number) => `$${cents / 100}`
