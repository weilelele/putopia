import { describe, expect, it, vi } from 'vitest'
import { initiationCheckoutPaymentMethods, initiationStripeQuote } from './initiation-config'
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
  STRIPE_INITIATION_CHECKOUT_CATALOG: JSON.stringify({
    initial: { productId: 'prod_new_initial', priceId: 'price_new_initial' },
    standard: { productId: 'prod_complete', priceId: 'price_complete' },
    paymentMethodConfigurationId: 'pmc_voyager',
  }),
}

describe('Voyager Pack checkout catalog', () => {
  it('switches both new Pack orders to their dedicated products without changing upgrades', () => {
    expect(initiationStripeQuote('standard', null, catalog)).toEqual({ productId: 'prod_shared', priceId: 'price_previous' })
    expect(initiationStripeQuote('initial', null, catalog)).toEqual({ productId: 'prod_shared', priceId: 'price_initial' })
    expect(initiationStripeQuote('standard', null, dedicatedCatalog)).toEqual({ productId: 'prod_complete', priceId: 'price_complete' })
    expect(initiationStripeQuote('initial', null, dedicatedCatalog)).toEqual({ productId: 'prod_new_initial', priceId: 'price_new_initial' })
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
    expect(initiationStripeQuote('initial', previous, dedicatedCatalog)).toEqual({ productId: 'prod_new_initial', priceId: 'price_new_initial' })
    expect(initiationCheckoutPaymentMethods(previous, dedicatedCatalog)).toEqual({ payment_method_types: ['card'] })
  })

  it.each(['initial', 'standard'] as const)('uses the dedicated payment methods and hides Link for new %s orders', kind => {
    const { productId, priceId } = initiationStripeQuote(kind, null, dedicatedCatalog)
    const order = { order_kind: kind, product_id: productId!, price_id: priceId! }
    expect(initiationCheckoutPaymentMethods(order, dedicatedCatalog)).toEqual({
      payment_method_configuration: 'pmc_voyager', wallet_options: { link: { display: 'never' } },
    })
  })
})
