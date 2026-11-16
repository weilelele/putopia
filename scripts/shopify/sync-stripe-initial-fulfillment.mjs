import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { checkCapturedInitial, INITIAL_PACK_SKUS, readShopifyShipments, stripeOrderTag } from './stripe-initial-fulfillment.mjs'

const ORDER_QUERY = `
query StripeInitialFulfillment($search: String!) {
  orders(first: 2, query: $search) {
    nodes {
      id test cancelledAt email tags displayFinancialStatus
      shippingAddress { name address1 address2 city provinceCode zip countryCodeV2 }
      totalPriceSet { shopMoney { amount currencyCode } }
      transactions(first: 5) { status kind manualPaymentGateway test }
      lineItems(first: 3) {
        nodes { id sku quantity requiresShipping }
        pageInfo { hasNextPage }
      }
      fulfillments(first: 10) {
        status displayStatus deliveredAt inTransitAt
        trackingInfo(first: 2) { number url }
        fulfillmentLineItems(first: 3) {
          nodes { quantity lineItem { id } }
          pageInfo { hasNextPage }
        }
      }
    }
  }
}`

function env(name, pattern) {
  const value = process.env[name]
  if (!value || (pattern && !pattern.test(value))) throw new Error(`Set ${name} in the private pilot environment file`)
  return value
}

async function post(url, body, headers) {
  const response = await fetch(url, {
    method: 'POST', headers, body,
    redirect: 'error', signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Shopify returned HTTP ${response.status}`)
  return response.json()
}

async function readShopifyOrder(shop, tag) {
  const base = `https://${shop}`
  const token = await post(`${base}/admin/oauth/access_token`, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env('SHOPIFY_FULFILLMENT_CLIENT_ID'),
    client_secret: env('SHOPIFY_FULFILLMENT_CLIENT_SECRET'),
  }), { 'Content-Type': 'application/x-www-form-urlencoded' })
  if (!token.access_token) throw new Error('Install the same-organization app with Shopify order read access')
  const result = await post(`${base}/admin/api/2026-10/graphql.json`, JSON.stringify({
    query: ORDER_QUERY, variables: { search: `tag:${tag}` },
  }), { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token.access_token })
  if (result.errors?.length) throw new Error('Shopify rejected the order query. Check read_orders and protected customer data access')
  const orders = result.data?.orders?.nodes
  if (orders?.length !== 1) throw new Error('Expected exactly one Shopify order with the pilot tag. Check for an absent or duplicate order')
  return orders[0]
}

async function main() {
  const [mode, id, flag, ...extra] = process.argv.slice(2)
  if (!['prepare', 'sync'].includes(mode) || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id ?? '')
    || extra.length || (flag && flag !== (mode === 'prepare' ? '--details' : '--apply'))) {
    throw new Error('Usage: node --env-file=<private-file> scripts/shopify/sync-stripe-initial-fulfillment.mjs prepare <order-uuid> [--details] or sync <order-uuid> [--apply]')
  }
  const db = createClient(env('SHOPIFY_FULFILLMENT_SUPABASE_URL', /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/),
    env('SHOPIFY_FULFILLMENT_SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
  const stripe = new Stripe(env('SHOPIFY_FULFILLMENT_STRIPE_READ_KEY', /^(rk|sk)_live_/), { maxNetworkRetries: 1, timeout: 10000 })
  const orderRead = await db.from('initiation_orders')
    .select('id,user_id,status,order_kind,amount,currency,pricing_version,paid_at,stripe_livemode,stripe_payment_intent,shipping')
    .eq('id', id).single()
  const order = orderRead.data
  if (orderRead.error || !order?.stripe_payment_intent) throw new Error('Could not read the Stripe-backed MultiverseCo order')
  const [intent, eligibility, userRead, shipmentsRead] = await Promise.all([
    stripe.paymentIntents.retrieve(order.stripe_payment_intent, { expand: ['latest_charge'] }),
    db.rpc('eligible_initial_initiation_order', { p_user: order.user_id }),
    db.auth.admin.getUserById(order.user_id),
    db.from('initiation_shipments').select('position,status,tracking_url').eq('order_id', id).order('position'),
  ])
  checkCapturedInitial(order, intent)
  const email = userRead.data?.user?.email
  const shipments = shipmentsRead.data
  if (eligibility.error || eligibility.data !== id || userRead.error || !email
    || shipmentsRead.error || shipments?.map(pack => pack.position).join(',') !== '1,2') {
    throw new Error('The verified order must own both existing Initial Pack records and have a member email')
  }
  const tag = stripeOrderTag(id)
  if (mode === 'prepare') {
    if (!shipments.every(pack => ['planned', 'preparing'].includes(pack.status) && !pack.tracking_url)) {
      throw new Error('First pilot requires both Packs to be unshipped with no existing tracking')
    }
    console.log(JSON.stringify({
      tag, total: '38.00 USD', skus: INITIAL_PACK_SKUS, packs: shipments.map(({ position, status }) => ({ position, status })),
      ...(flag === '--details' ? { email, shipping: order.shipping } : {}),
    }, null, 2))
    return
  }

  const shop = env('SHOPIFY_FULFILLMENT_SHOP', /^[a-z0-9-]+\.myshopify\.com$/)
  const shopifyOrder = await readShopifyOrder(shop, tag)
  const shopifyId = /^gid:\/\/shopify\/Order\/(\d+)$/.exec(shopifyOrder.id)?.[1]
  if (!shopifyId) throw new Error('Missing Shopify order ID')
  const packs = readShopifyShipments(shopifyOrder, order, email)
  const summary = Object.entries(packs).map(([position, pack]) => ({ position, status: pack.status, hasTracking: !!pack.trackingNumber }))
  if (flag !== '--apply') {
    console.log(JSON.stringify({ result: 'verified_dry_run', shopifyId, packs: summary }))
    return
  }
  const sync = await db.rpc('sync_shopify_initial_shipments', { p_order: id, p_shopify_ref: `${shop}/${shopifyId}`, p_packs: packs })
  if (sync.error) throw new Error(`Shipment sync rejected (${sync.error.code ?? 'unknown'}). Review the order, Pack status, and migration before retrying`)
  console.log(JSON.stringify({ result: 'synced', shopifyId, changed: sync.data, packs: summary }))
}

main().catch(error => {
  // Stripe and fetch can include request data in nested errors. Print only known operational messages.
  const message = error.type === 'StripeAuthenticationError'
    ? 'Stripe rejected the live read credential. Update SHOPIFY_FULFILLMENT_STRIPE_READ_KEY.'
    : error.constructor === Error ? error.message : `Request failed (${error.code ?? error.type ?? error.name})`
  console.error(message)
  process.exitCode = 1
})
