// Explicit, non-financial checkout inspection. Creates four anonymous carts only;
// no customer identity, local reservation, payment, order, or refund is created.
import { readFile } from 'node:fs/promises'
const shop = 'jtuuus-k3.myshopify.com'
const offers = JSON.parse(await readFile(new URL('./membership-catalog.json', import.meta.url), 'utf8'))
const publicToken = process.env.SHOPIFY_LIVE_STOREFRONT_PUBLIC_TOKEN
if (!publicToken) throw new Error('Existing Headless Storefront access is required.')
for (const offer of offers) {
  const variantId = process.env[offer.env]
  if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variantId ?? '')) throw new Error(`Missing verified catalog ID: ${offer.env}`)
  const response = await fetch(`https://${shop}/api/2026-10/graphql.json`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': publicToken },
    body: JSON.stringify({ query: `mutation InspectMembershipCart($input:CartInput!) {
      cartCreate(input:$input) { userErrors {code} cart {
        checkoutUrl totalQuantity cost { subtotalAmount {amount currencyCode} totalAmount {amount currencyCode} }
        deliveryGroups(first:1) { nodes {id} }
      } }
    }`, variables: { input: { lines: [{merchandiseId:variantId,quantity:1}], buyerIdentity:{countryCode:'US'} } } }),
  })
  if (!response.ok) throw new Error(`Cart inspection failed: HTTP ${response.status}`)
  const result = await response.json()
  const cart = result.data?.cartCreate.cart
  if (result.errors?.length || result.data?.cartCreate.userErrors.length || !cart
    || cart.cost.subtotalAmount.currencyCode !== 'USD' || Number(cart.cost.subtotalAmount.amount)*100 !== offer.amount
    || cart.cost.totalAmount.currencyCode !== 'USD' || Number(cart.cost.totalAmount.amount)*100 !== offer.amount
    || (!offer.packs.length && cart.deliveryGroups.nodes.length !== 0)) throw new Error(`Checkout amount or digital delivery mismatch: ${offer.env}`)
  console.log(JSON.stringify({offer:offer.env,amount:cart.cost.totalAmount.amount,currency:'USD',digital:!offer.packs.length,deliveryGroups:cart.deliveryGroups.nodes.length}))
}
