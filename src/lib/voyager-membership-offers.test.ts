import { describe, expect, it } from 'vitest'
import { membershipOffers } from './voyager-membership-offers'

describe('Voyager Membership offers', () => {
  it('uses the digital-only amount and keeps the two pack prices', () => {
    const offers = membershipOffers('none')
    expect(offers.map(offer => offer.amount)).toEqual([1200, 3800, 48800])
    expect(offers[0].packs).toEqual([])
  })

  it('applies the membership payment once to each direct upgrade', () => {
    const [initial, complete] = membershipOffers('membership')
    expect(initial).toMatchObject({ target: 'initial', amount: 2600, credit: 1200, packs: [1, 2] })
    expect(complete).toMatchObject({ target: 'standard', amount: 47600, credit: 1200, packs: [1, 2, 3, 4] })
  })

  it('charges the agreed $460 for the remaining packs after Initial', () => {
    expect(membershipOffers('initial')).toEqual([expect.objectContaining({
      amount: 46000, credit: 0, packs: [3, 4],
    })])
  })
})
