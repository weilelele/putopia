// Read-only Shopify catalog verification. Credentials are consumed only from the process environment.
// --write-env-file writes product variant IDs only, never credentials or tokens.
import { readFile, writeFile } from 'node:fs/promises'
import { validateMembershipCatalog } from '../../src/lib/shopify-membership-catalog.ts'
const shop = 'jtuuus-k3.myshopify.com'
const version = '2026-10'
const offers = JSON.parse(await readFile(new URL('./membership-catalog.json', import.meta.url), 'utf8'))
const allowDraft = process.argv.includes('--allow-draft')
const outputFlag = process.argv.indexOf('--write-env-file')
const id = process.env.SHOPIFY_LIVE_CLIENT_ID, secret = process.env.SHOPIFY_LIVE_CLIENT_SECRET
if (!id || !secret) throw new Error('Existing Shopify app credentials must be supplied to this process.')
async function json(url, headers, body) {
  const response = await fetch(url, {method:'POST',headers,body,redirect:'error',signal:AbortSignal.timeout(15000)})
  if (!response.ok) throw new Error(`Shopify catalog request failed with HTTP ${response.status}`)
  return response.json()
}
const token = await json(`https://${shop}/admin/oauth/access_token`, {'Content-Type':'application/x-www-form-urlencoded'},
  new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret}))
if (!token.access_token) throw new Error('Shopify catalog authorization was not confirmed.')
const result = await json(`https://${shop}/admin/api/${version}/graphql.json`, {'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token}, JSON.stringify({
  query:`query MembershipCatalog($ids:[ID!]!) {
    shop { currencyCode taxesIncluded }
    nodes(ids:$ids) { ... on Product {
      id title status requiresSellingPlan
      variants(first:2) { pageInfo { hasNextPage } nodes {
        id price sku requiresComponents inventoryItem { requiresShipping }
        productVariantComponents(first:5) { pageInfo { hasNextPage } nodes { quantity productVariant { sku inventoryItem { requiresShipping } } } }
      } }
    } }
  }`,variables:{ids:offers.map(offer=>offer.productId)},
}))
if (result.errors?.length || !result.data || result.data.shop.currencyCode !== 'USD' || !result.data.shop.taxesIncluded) throw new Error('Shopify USD/tax-inclusive catalog could not be verified.')
const entries = validateMembershipCatalog(result.data.nodes.filter(Boolean),offers,allowDraft)
if (!allowDraft) {
  const privateToken=process.env.SHOPIFY_LIVE_STOREFRONT_TOKEN, publicToken=process.env.SHOPIFY_LIVE_STOREFRONT_PUBLIC_TOKEN
  if (!privateToken && !publicToken) throw new Error('Existing Storefront access is required to verify publication.')
  const storefront=await json(`https://${shop}/api/${version}/graphql.json`, {'Content-Type':'application/json',...(privateToken?{'Shopify-Storefront-Private-Token':privateToken}:{'X-Shopify-Storefront-Access-Token':publicToken})},JSON.stringify({
    query:'query MembershipStorefront($ids:[ID!]!) @inContext(country:US) {nodes(ids:$ids){...on ProductVariant{id availableForSale requiresShipping price{amount currencyCode}}}}',variables:{ids:Object.values(entries)},
  }))
  if (storefront.errors?.length || !storefront.data || storefront.data.nodes.length !== offers.length || storefront.data.nodes.some((node,index)=>!node || !node.availableForSale || node.id!==entries[offers[index].env] || node.price.currencyCode!=='USD' || Math.round(Number(node.price.amount)*100)!==offers[index].amount || node.requiresShipping!==(offers[index].packs.length>0))) throw new Error('Membership offers are not available through the configured Storefront at their fixed prices.')
}
if (outputFlag >= 0) {
  const output = process.argv[outputFlag+1]
  if (!output || output.startsWith('--')) throw new Error('Provide an output file for the non-secret variant IDs.')
  await writeFile(output,Object.entries(entries).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600,flag:'wx'})
}
console.log(JSON.stringify({ready:!allowDraft,checkedOffers:offers.length,variantIds:entries,draftCheck:allowDraft},null,2))
