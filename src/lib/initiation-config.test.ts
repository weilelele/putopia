import { describe, expect, it, vi } from 'vitest'
import { initiationStripeQuote } from './initiation-config'
import { INITIATION_PRICING_VERSION } from './initiation-pricing'

vi.mock('server-only', () => ({}))

const catalog = {
  STRIPE_INITIATION_PRODUCT_ID: 'prod_shared',
  STRIPE_INITIATION_PRICE_ID: 'price_previous',
  STRIPE_INITIATION_INITIAL_PRICE_ID: 'price_initial',
  STRIPE_INITIATION_UPGRADE_PRICE_ID: 'price_upgrade',
}
const dedicatedCatalog = {
  ...catalog,
  STRIPE_INITIATION_COMPLETE_PRODUCT_ID: 'prod_complete',
  STRIPE_INITIATION_COMPLETE_PRICE_ID: 'price_complete',
}

describe('Complete checkout catalog', () => {
  it('selects the dedicated product only for new Complete orders when configured', () => {
    expect(initiationStripeQuote('standard', null, catalog)).toEqual({ productId: 'prod_shared', priceId: 'price_previous' })
    expect(initiationStripeQuote('standard', null, dedicatedCatalog)).toEqual({ productId: 'prod_complete', priceId: 'price_complete' })
    expect(initiationStripeQuote('initial', null, dedicatedCatalog)).toEqual({ productId: 'prod_shared', priceId: 'price_initial' })
    expect(initiationStripeQuote('legacy_upgrade', null, dedicatedCatalog)).toEqual({ productId: 'prod_shared', priceId: 'price_upgrade' })
  })

  it('uses the saved quote when a customer resumes a pending Complete order', () => {
    const previous = {
      status: 'pending',
      order_kind: 'standard' as const,
      pricing_version: INITIATION_PRICING_VERSION,
      product_id: 'prod_shared',
      price_id: 'price_previous',
    }
    expect(initiationStripeQuote('standard', previous, dedicatedCatalog)).toEqual({ productId: 'prod_shared', priceId: 'price_previous' })
    expect(initiationStripeQuote('initial', previous, dedicatedCatalog)).toEqual({ productId: 'prod_shared', priceId: 'price_initial' })
  })
})
