type Variant = {
  id: string
  price: string
  sku: string | null
  requiresComponents: boolean
  inventoryItem: { requiresShipping: boolean }
  productVariantComponents: { nodes: { quantity: number; productVariant: { sku: string | null; inventoryItem: { requiresShipping: boolean } } }[]; pageInfo: { hasNextPage: boolean } }
}
type Product = { id: string; title: string; status: string; requiresSellingPlan: boolean; variants: { nodes: Variant[]; pageInfo: { hasNextPage: boolean } } }
export type MembershipCatalogOffer = { productId: string; env: string; amount: number; packs: number[] }
const skus = ['INITIAL-PACK-1', 'INITIAL-PACK-2', 'COMPLETE-PACK-3', 'COMPLETE-PACK-4']

/** Product catalog evidence only; customer ownership is independently checked at payment capture. */
export function validateMembershipCatalog(products: Product[], offers: MembershipCatalogOffer[], allowDraft = false) {
  const entries: Record<string, string> = {}
  for (const offer of offers) {
    const product = products.find(product => product.id === offer.productId)
    const fail = () => { throw new Error(`Catalog validation failed for ${offer.env}`) }
    if (!product || product.requiresSellingPlan || !['UNLISTED', ...(allowDraft ? ['DRAFT'] : [])].includes(product.status)
      || product.variants.pageInfo.hasNextPage || product.variants.nodes.length !== 1) fail()
    const variant = product!.variants.nodes[0]
    if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variant.id) || !/^\d+(?:\.\d{1,2})?$/.test(variant.price)
      || Math.round(Number(variant.price) * 100) !== offer.amount || variant.requiresComponents !== (offer.packs.length > 0)
      || variant.inventoryItem.requiresShipping !== (offer.packs.length > 0) || variant.productVariantComponents.pageInfo.hasNextPage) fail()
    const components = variant.productVariantComponents.nodes
    if (!offer.packs.length) {
      if (variant.sku !== 'VOYAGER-MEMBERSHIP-S26' || components.length) fail()
    } else if (components.length !== offer.packs.length || components.some(component => component.quantity !== 1 || !component.productVariant.inventoryItem.requiresShipping)
      || components.map(component => component.productVariant.sku).sort().join(',') !== offer.packs.map(position => skus[position - 1]).sort().join(',')) fail()
    if (Object.values(entries).includes(variant.id)) fail()
    entries[offer.env] = variant.id
  }
  return entries
}
