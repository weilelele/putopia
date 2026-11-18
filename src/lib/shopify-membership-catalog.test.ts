import { describe, expect, it } from 'vitest'
import { validateMembershipCatalog, validateStorefrontMembershipCatalog } from './shopify-membership-catalog'
const offer = { productId: 'gid://shopify/Product/1', env: 'MEMBERSHIP', amount: 1200, packs: [] as number[] }
const digital = () => ({ id: offer.productId, title: 'Membership', status: 'UNLISTED', requiresSellingPlan: false,
  variants: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'gid://shopify/ProductVariant/1', price: '12.00', sku: 'VOYAGER-MEMBERSHIP-S26',
    requiresComponents: false, inventoryItem: { requiresShipping: false }, productVariantComponents: { nodes: [] as { quantity: number; productVariant: { sku: string; inventoryItem: { requiresShipping: boolean } } }[], pageInfo: { hasNextPage: false } } }] } })
describe('Shopify Membership launch catalog', () => {
  it('requires a fixed one-time nonshipping $12 variant', () => {
    expect(validateMembershipCatalog([digital()], [offer])).toEqual({ MEMBERSHIP: 'gid://shopify/ProductVariant/1' })
    for (const patch of [{ price: '10.00' }, { sku: 'INITIAL-PACK-1' }, { inventoryItem: { requiresShipping: true } }]) {
      const product = digital(); Object.assign(product.variants.nodes[0], patch)
      expect(() => validateMembershipCatalog([product], [offer])).toThrow('Catalog validation')
    }
    expect(() => validateMembershipCatalog([{ ...digital(), requiresSellingPlan: true }], [offer])).toThrow()
  })
  it('treats a draft as preparation, never launch readiness', () => {
    const draft = { ...digital(), status: 'DRAFT' }
    expect(() => validateMembershipCatalog([draft], [offer])).toThrow()
    expect(validateMembershipCatalog([draft], [offer], true)).toHaveProperty('MEMBERSHIP')
  })
  it('requires each physical Pack exactly once at the net bundle price', () => {
    const product = digital(), variant = product.variants.nodes[0]
    Object.assign(variant, { price: '26', requiresComponents: true, inventoryItem: { requiresShipping: true } })
    variant.productVariantComponents.nodes = [1, 2].map(n => ({ quantity: 1, productVariant: { sku: `INITIAL-PACK-${n}`, inventoryItem: { requiresShipping: true } } }))
    const upgrade = { ...offer, amount: 2600, packs: [1, 2] }
    expect(validateMembershipCatalog([product], [upgrade])).toHaveProperty('MEMBERSHIP')
    variant.productVariantComponents.nodes[1].quantity = 2
    expect(() => validateMembershipCatalog([product], [upgrade])).toThrow()
  })
})

describe('existing Shopify Headless catalog evidence', () => {
  function published() {
    return { id: offer.productId, requiresSellingPlan: false, variants: { pageInfo: { hasNextPage: false }, nodes: [{
      id: 'gid://shopify/ProductVariant/1', sku: 'VOYAGER-MEMBERSHIP-S26', availableForSale: true,
      price: { amount: '12.00', currencyCode: 'USD' }, requiresShipping: false, requiresComponents: false,
      components: { pageInfo: { hasNextPage: false }, nodes: [] as { quantity: number; productVariant: { sku: string; requiresShipping: boolean } }[] },
    }] } }
  }
  it('proves digital Membership is available at the fixed price without additional Admin product scopes', () => {
    expect(validateStorefrontMembershipCatalog([published()], [offer])).toHaveProperty('MEMBERSHIP')
    expect(() => validateStorefrontMembershipCatalog([null], [offer])).toThrow()
    const unavailable = published(); unavailable.variants.nodes[0].availableForSale = false
    expect(() => validateStorefrontMembershipCatalog([unavailable], [offer])).toThrow()
  })
  it('rejects extra charges, recurring-only products and a shipping requirement', () => {
    for (const patch of [{ price: { amount: '13.00', currencyCode: 'USD' } }, { price: { amount: '12.00', currencyCode: 'EUR' } }, { requiresShipping: true }]) {
      const product = published(); Object.assign(product.variants.nodes[0], patch)
      expect(() => validateStorefrontMembershipCatalog([product], [offer])).toThrow()
    }
    expect(() => validateStorefrontMembershipCatalog([{ ...published(), requiresSellingPlan: true }], [offer])).toThrow()
  })
  it('verifies actual component quantities and SKUs on a $26 upgrade', () => {
    const product = published(), variant = product.variants.nodes[0]
    Object.assign(variant, { requiresShipping: true, requiresComponents: true, price: { amount: '26', currencyCode: 'USD' } })
    variant.components.nodes = [1, 2].map(n => ({ quantity: 1, productVariant: { sku: `INITIAL-PACK-${n}`, requiresShipping: true } }))
    expect(validateStorefrontMembershipCatalog([product], [{ ...offer, amount: 2600, packs: [1, 2] }])).toHaveProperty('MEMBERSHIP')
    variant.components.nodes[1].productVariant.sku = 'INITIAL-PACK-1'
    expect(() => validateStorefrontMembershipCatalog([product], [{ ...offer, amount: 2600, packs: [1, 2] }])).toThrow()
  })
})
