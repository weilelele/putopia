import { describe, expect, it } from 'vitest'
import { validateMembershipCatalog } from './shopify-membership-catalog'
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
