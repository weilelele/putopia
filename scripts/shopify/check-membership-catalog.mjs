// Read-only verification; credentials stay in this process and are never printed or saved.
// Admin shop settings + existing Headless API avoid requesting additional read_products permission.
import { readFile } from 'node:fs/promises'
import { validateStorefrontMembershipCatalog } from '../../src/lib/shopify-membership-catalog.ts'
import { INITIAL_PILOT_QUERY } from './initial-pilot-order.mjs'
const shop = 'jtuuus-k3.myshopify.com'
const version = '2026-10'
const offers = JSON.parse(await readFile(new URL('./membership-catalog.json', import.meta.url), 'utf8'))
const shopOnly = process.argv.includes('--shop-only')
const id = process.env.SHOPIFY_LIVE_CLIENT_ID, secret = process.env.SHOPIFY_LIVE_CLIENT_SECRET
if (!id || !secret) throw new Error('Existing Shopify app credentials must be supplied to this process.')
async function json(url, headers, body) {
  const response = await fetch(url, {method:'POST',headers,body,redirect:'error',signal:AbortSignal.timeout(15000)})
  if (!response.ok) throw new Error(`Shopify verification request failed with HTTP ${response.status}`)
  return response.json()
}
const token = await json(`https://${shop}/admin/oauth/access_token`, {'Content-Type':'application/x-www-form-urlencoded'},
  new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret}))
if (!token.access_token) throw new Error('Shopify authorization was not confirmed.')
const result = await json(`https://${shop}/admin/api/${version}/graphql.json`, {'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token}, JSON.stringify({query:'query MembershipShopSettings { shop { currencyCode taxesIncluded } }'}))
if (result.errors?.length || !result.data) throw new Error('Shopify shop settings could not be verified.')
const settings={currency:result.data.shop.currencyCode,taxesIncluded:result.data.shop.taxesIncluded}
const subscriptions = await json(`https://${shop}/admin/api/${version}/graphql.json`, {'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token}, JSON.stringify({
  query:'query MembershipWebhookSettings { webhookSubscriptions(first:100) { pageInfo {hasNextPage} nodes {topic uri} } }',
}))
// Print only topic names for the existing public callback, never arbitrary endpoint URLs.
const webhookTopics = subscriptions.errors?.length ? null : subscriptions.data?.webhookSubscriptions.nodes
  .filter(subscription => subscription.uri === 'https://www.multiverseco.org/api/shopify/webhook').map(subscription => subscription.topic).sort()
const webhookSettings = { topics: webhookTopics, complete: subscriptions.data?.webhookSubscriptions.pageInfo.hasNextPage === false }
// Read the historical order item IDs using read_orders, without reading a live
// ProductVariant relation or logging orders, buyers, payment details, or responses.
const orderRead = await json(`https://${shop}/admin/api/${version}/graphql.json`, {'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token}, JSON.stringify({
  query:'query MembershipOrderAccess { orders(first:1,sortKey:CREATED_AT,reverse:true) { nodes { id } } }',
}))
const latestId=orderRead.data?.orders.nodes[0]?.id?.match(/^gid:\/\/shopify\/Order\/(\d+)$/)?.[1]
let orderAccess = { verified:false, method:'order-snapshot', status:null, orderFieldsVerified:false }
if (!orderRead.errors?.length && latestId) {
  const response = await fetch(`https://${shop}/admin/api/${version}/orders/${latestId}.json?fields=id,line_items`, {
    headers:{'X-Shopify-Access-Token':token.access_token},redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store',
  })
  const snapshot=response.ok?await response.json():null
  const fullOrder=await json(`https://${shop}/admin/api/${version}/graphql.json`, {'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token}, JSON.stringify({
    query:INITIAL_PILOT_QUERY,variables:{id:`gid://shopify/Order/${latestId}`,isComplete:true},
  }))
  orderAccess={verified:!!snapshot?.order && String(snapshot.order.id)===latestId && Array.isArray(snapshot.order.line_items),method:'order-snapshot',status:response.status,
    orderFieldsVerified:!fullOrder.errors?.length && fullOrder.data?.order?.id===`gid://shopify/Order/${latestId}`}
}
if (shopOnly) {
  console.log(JSON.stringify({shopSettings:settings,webhookSettings,orderAccess,catalogChecked:false},null,2))
} else {
  if (settings.currency !== 'USD') throw new Error('Shopify USD pricing is not configured.')
  if (!orderAccess.verified || !orderAccess.orderFieldsVerified) throw new Error('Existing Shopify order/snapshot access could not be verified.')
  if (!webhookSettings.complete || !['ORDERS_CREATE','ORDERS_PAID','ORDERS_UPDATED','ORDERS_CANCELLED','REFUNDS_CREATE'].every(topic=>webhookTopics?.includes(topic))) throw new Error('Shopify payment/refund notifications could not be verified.')
  const privateToken=process.env.SHOPIFY_LIVE_STOREFRONT_TOKEN, publicToken=process.env.SHOPIFY_LIVE_STOREFRONT_PUBLIC_TOKEN
  if (!privateToken && !publicToken) throw new Error('Existing Storefront access is required to verify publication.')
  const storefront=await json(`https://${shop}/api/${version}/graphql.json`, {'Content-Type':'application/json',...(privateToken?{'Shopify-Storefront-Private-Token':privateToken}:{'X-Shopify-Storefront-Access-Token':publicToken})},JSON.stringify({
    query:`query MembershipStorefront($ids:[ID!]!) @inContext(country:US) {
      nodes(ids:$ids) {...on Product {
        id requiresSellingPlan variants(first:2) { pageInfo {hasNextPage} nodes {
          id sku availableForSale requiresShipping requiresComponents price {amount currencyCode}
          components(first:5) {pageInfo {hasNextPage} nodes {quantity productVariant {sku requiresShipping}}}
        }}
      }}
    }`,variables:{ids:offers.map(offer=>offer.productId)},
  }))
  if (storefront.errors?.length || !storefront.data) throw new Error('Shopify Headless catalog query could not be verified.')
  const entries=validateStorefrontMembershipCatalog(storefront.data.nodes,offers)
  if (Object.entries(entries).some(([key,value])=>process.env[key] && process.env[key]!==value)) throw new Error('Configured Shopify variant IDs do not match the published catalog.')
  console.log(JSON.stringify({catalogReady:true,checkedOffers:offers.length,shopSettings:settings,webhookSettings,orderAccess,variantIds:entries},null,2))
}
