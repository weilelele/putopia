import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { CURRENT_STRIPE_BUNDLES, checkCapturedStripeBundle, readShopifyShipments, stripeOrderTag } from './stripe-initial-fulfillment.mjs'

const variants = ['67965516546239', '67965521559743', '67973291638975', '67973292064959']
const scopeNames = ['write_orders', 'write_merchant_managed_fulfillment_orders']
const sourceColumns = 'id,user_id,status,order_kind,amount,currency,pricing_version,paid_at,stripe_livemode,stripe_payment_intent,stripe_session_id,shipping'
const shop = 'jtuuus-k3.myshopify.com'
const orderFields = `
  id test cancelledAt updatedAt email tags displayFinancialStatus
  shippingAddress { name address1 address2 city provinceCode zip countryCodeV2 phone }
  totalPriceSet { shopMoney { amount currencyCode } }
  totalTaxSet { shopMoney { amount currencyCode } }
  transactions(first: 5) { status kind gateway manualPaymentGateway test amountSet { shopMoney { amount currencyCode } } }
  lineItems(first: 5) { nodes { id sku quantity requiresShipping } pageInfo { hasNextPage } }
  fulfillments(first: 10) {
    status displayStatus deliveredAt inTransitAt
    trackingInfo(first: 2) { number url }
    fulfillmentLineItems(first: 5) { nodes { quantity lineItem { id } } pageInfo { hasNextPage } }
  }`

function requireThat(condition, message) {
  if (!condition) throw new Error(message)
}

async function post(url, body, headers) {
  const response = await fetch(url, { method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(15000) })
  requireThat(response.ok, `Shopify HTTP ${response.status}`)
  return response.json()
}

async function shopifyApi() {
  requireThat((process.env.SHOPIFY_FULFILLMENT_SHOP || process.env.SHOPIFY_PILOT_SHOP) === shop, 'Expected the authorized Putopia Shopify shop')
  const clientId = process.env.SHOPIFY_FULFILLMENT_CLIENT_ID || process.env.SHOPIFY_PILOT_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_FULFILLMENT_CLIENT_SECRET || process.env.SHOPIFY_PILOT_CLIENT_SECRET
  requireThat(clientId && clientSecret, 'Shopify Admin app credentials are required')
  const token = await post(`https://${shop}/admin/oauth/access_token`, new URLSearchParams({
    grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret,
  }))
  requireThat(token.access_token, 'Shopify did not grant an Admin token')
  return async (query, variables = {}) => {
    const payload = await post(`https://${shop}/admin/api/2026-10/graphql.json`, JSON.stringify({ query, variables }), {
      'Content-Type': 'application/json', 'X-Shopify-Access-Token': token.access_token,
    })
    requireThat(!payload.errors?.length && payload.data, 'Shopify rejected the request. Check the installed app scopes and protected data access')
    return payload.data
  }
}

function stripeReader() {
  const key = process.env.SHOPIFY_FULFILLMENT_STRIPE_READ_KEY
  if (key) {
    requireThat(/^(rk|sk)_live_/.test(key), 'Expected a live Stripe read credential')
    const stripe = new Stripe(key, { maxNetworkRetries: 1, timeout: 10000 })
    return {
      intent: id => stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] }),
      session: id => stripe.checkout.sessions.retrieve(id),
    }
  }
  // Reuse the operator's authenticated Stripe CLI without exporting its secret.
  const run = promisify(execFile)
  const get = async (path, args = []) => {
    const { stdout } = await run('stripe', ['get', path, '--live', ...args], { timeout: 15000 })
    const result = JSON.parse(stdout)
    requireThat(!result.error, 'Stripe CLI could not verify the source payment')
    return result
  }
  return {
    intent: id => get(`/v1/payment_intents/${id}`, ['-d', 'expand[]=latest_charge']),
    session: id => get(`/v1/checkout/sessions/${id}`),
  }
}

function money(amount) {
  return { shopMoney: { currencyCode: 'USD', amount: (amount / 100).toFixed(2) } }
}

function shippingAddress(shipping) {
  const names = shipping.name.trim().split(/\s+/)
  const lastName = names.pop()
  const address = shipping.address
  return {
    firstName: names.join(' ') || undefined, lastName, address1: address.line1, address2: address.line2 ?? undefined,
    city: address.city, provinceCode: address.state, zip: address.postal_code, countryCode: address.country,
    phone: shipping.phone ?? undefined,
  }
}

function addressKey(value) {
  return (value ?? '').trim().toUpperCase().replace(/[^\p{L}\p{N}]/gu, '')
}

async function readSource(db, stripe, selector, clean) {
  const base = db.from('initiation_orders').select(sourceColumns)
  const selected = ['initial', 'standard'].includes(selector)
    ? await base.eq('order_kind', selector).eq('status', 'paid').eq('stripe_livemode', true).order('paid_at').limit(20) : await base.eq('id', selector).limit(1)
  requireThat(!selected.error && selected.data?.length, 'No matching live Stripe order was found')
  const rejected = new Map()
  for (const order of selected.data) {
    try {
      requireThat(/^pi_[A-Za-z0-9]+$/.test(order.stripe_payment_intent) && /^cs_live_[A-Za-z0-9]+$/.test(order.stripe_session_id), 'Order needs both original Stripe references')
      const [intent, session, packs, buyer] = await Promise.all([
        stripe.intent(order.stripe_payment_intent), stripe.session(order.stripe_session_id),
        db.from('initiation_shipments').select('position,status,tracking_url').eq('order_id', order.id).order('position'),
        db.auth.admin.getUserById(order.user_id),
      ])
      checkCapturedStripeBundle(order, intent, session)
      const offer = CURRENT_STRIPE_BUNDLES[order.order_kind]
      const email = buyer.data?.user?.email?.trim().toLowerCase()
      const detail = session.collected_information?.shipping_details ?? session.shipping_details
      const local = order.shipping.address
      requireThat(session.livemode && session.status === 'complete' && session.mode === 'payment' && session.payment_status === 'paid'
        && session.amount_total === offer.amount && session.currency === 'usd'
        && session.total_details?.amount_tax === 0 && session.total_details?.amount_shipping === 0
        && session.total_details?.amount_discount === 0, 'First import requires original Stripe total with zero separate tax, shipping or discounts')
      requireThat(!buyer.error && email && session.customer_details?.email?.trim().toLowerCase() === email
        && detail && addressKey(detail.name) === addressKey(order.shipping.name)
        && ['line1','line2','city','state','postal_code','country'].every(key => addressKey(detail.address?.[key]) === addressKey(local[key])),
      'Original Stripe email and address must match Putopia')
      requireThat(!packs.error && packs.data.map(pack => pack.position).join(',') === offer.skus.map((_, i) => i + 1).join(',')
        && (!clean || packs.data.every(pack => ['planned','preparing'].includes(pack.status) && !pack.tracking_url)),
      'Expected one existing eligible record for each Pack')
      return { order, offer, email, packs: packs.data }
    } catch (error) {
      if (selected.data.length === 1) throw error
      const reason = error.constructor === Error && !error.cmd && !error.cause ? error.message : 'Source data or API check failed'
      rejected.set(reason, (rejected.get(reason) ?? 0) + 1)
    }
  }
  throw new Error(`No order passed preflight. ${[...rejected].map(([reason, count]) => `${count} × ${reason}`).join('. ')}`)
}

async function lookupOrder(api, source, id) {
  if (id) return (await api(`query($id:ID!){order(id:$id){${orderFields}}}`, { id })).order
  const tag = stripeOrderTag(source.id)
  const { orders } = await api(`query($search:String!){orders(first:2,query:$search){nodes{${orderFields}} pageInfo{hasNextPage}}}`, { search: `tag:${tag}` })
  requireThat(!orders.pageInfo.hasNextPage && orders.nodes.length <= 1, 'Duplicate source tag in Shopify. Review the order before retrying')
  return orders.nodes[0] ?? null
}

async function createOrder(api, source) {
  const { order, offer, email } = source
  const orderReceipt = {
    currency: 'USD', processedAt: order.paid_at, sourceIdentifier: order.id, tags: [stripeOrderTag(order.id), 'Putopia Stripe import'],
    financialStatus: 'PAID', email, shippingAddress: shippingAddress(order.shipping), test: false,
    buyerAcceptsMarketing: false,
    lineItems: offer.skus.map((sku, i) => ({
      variantId: `gid://shopify/ProductVariant/${variants[i]}`, sku, priceSet: money(offer.prices[i]), quantity: 1, requiresShipping: true,
    })),
    transactions: [{ gateway: 'manual', kind: 'SALE', status: 'SUCCESS', amountSet: money(offer.amount), processedAt: order.paid_at, test: false }],
  }
  const { orderCreate } = await api(`mutation($order:OrderCreateOrderInput!,$options:OrderCreateOptionsInput!){
    orderCreate(order:$order,options:$options){order{id} userErrors{field}}
  }`, {
    order: orderReceipt,
    options: { inventoryBehaviour: 'BYPASS', sendReceipt: false, sendFulfillmentReceipt: false },
  })
  requireThat(orderCreate.order?.id && !orderCreate.userErrors.length,
    'Shopify order creation needs review. Check the source tag and reservation before another write')
  return orderCreate.order.id
}

async function splitOutstandingPacks(api, id, skus) {
  for (let i = 0; i < skus.length; i++) {
    const { order } = await api(`query($id:ID!){order(id:$id){fulfillmentOrders(first:10){
      pageInfo{hasNextPage} nodes{id status assignedLocation{zip countryCode}
        lineItems(first:5){pageInfo{hasNextPage} nodes{id sku remainingQuantity}}
      }
    }}}`, { id })
    const groups = order?.fulfillmentOrders
    requireThat(groups && !groups.pageInfo.hasNextPage && groups.nodes.every(g => !g.lineItems.pageInfo.hasNextPage),
      'Shopify fulfillment routing is incomplete')
    const active = groups.nodes.map(g => ({ ...g, items: g.lineItems.nodes.filter(item => item.remainingQuantity > 0) })).filter(g => g.items.length)
    const items = active.flatMap(g => g.items)
    requireThat(items.length === skus.length && skus.every(sku => items.some(item => item.sku === sku && item.remainingQuantity === 1))
      && active.every(g => g.assignedLocation.countryCode === 'US' && /^95054(?:-\d{4})?$/.test(g.assignedLocation.zip ?? '')),
    'Expected every selected Pack to be awaiting dispatch from ZIP 95054')
    const group = active.find(g => g.items.length > 1)
    if (!group) return active.length
    const item = group.items.at(-1)
    const { fulfillmentOrderSplit } = await api(`mutation($input:[FulfillmentOrderSplitInput!]!){
      fulfillmentOrderSplit(fulfillmentOrderSplits:$input){userErrors{field}}
    }`, { input: [{ fulfillmentOrderId: group.id, fulfillmentOrderLineItems: [{ id: item.id, quantity: 1 }] }] })
    requireThat(!fulfillmentOrderSplit.userErrors.length, 'Shopify rejected the split. Review current fulfillment orders before retrying')
  }
  throw new Error('Shopify did not yet confirm all Pack splits')
}

async function main() {
  const [mode, selector, flag, ...rest] = process.argv.slice(2)
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
  const valid = mode === 'prepare' ? ['initial', 'standard'].includes(selector) || uuid.test(selector) : uuid.test(selector)
  requireThat(['prepare','import','split','sync'].includes(mode) && valid && !rest.length
    && (['import','split','sync'].includes(mode) ? flag === '--apply' : !flag),
  'Usage: prepare <initial|standard|order-uuid> or <import|split|sync> <order-uuid> --apply')
  const dbUrl = process.env.SHOPIFY_FULFILLMENT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const dbKey = process.env.SHOPIFY_FULFILLMENT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  requireThat(dbUrl?.replace(/\/$/,'') === 'https://oxwfnmcwovxnrvagxzdz.supabase.co' && dbKey,
    'Expected the Putopia production database and server credential')
  const db = createClient(dbUrl, dbKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const source = await readSource(db, stripeReader(), selector, !['sync','split'].includes(mode))
  const api = await shopifyApi()
  const { currentAppInstallation } = await api('{currentAppInstallation{accessScopes{handle}}}')
  const missing = scopeNames.filter(scope => !currentAppInstallation.accessScopes.some(grant => grant.handle === scope))
  const { order, offer } = source
  const already = await lookupOrder(api, order)
  if (mode === 'prepare') {
    console.log(JSON.stringify({ sourceId: order.id, kind: order.order_kind, verifiedCents: offer.amount, shipToMatchesStripe: true,
      packPositions: source.packs.map(pack => pack.position), existingShopifyOrder: already?.id ?? null, missingScopes: missing }))
    return
  }
  requireThat(!missing.length, `Shopify permissions awaiting approval: ${missing.join(', ')}`)
  let live = already
  if (!live) {
    requireThat(mode === 'import', 'No Shopify order exists for this source tag')
    const reservation = await db.rpc('reserve_shopify_stripe_order_import', { p_order: order.id, p_shop: shop })
    requireThat(!reservation.error, 'Reservation rejected. Verify production migrations and eligibility before retrying')
    requireThat(reservation.data === true, 'An import is already reserved. Reconcile the Shopify tag before any new write')
    live = await lookupOrder(api, order, await createOrder(api, source))
  }
  const packs = readShopifyShipments(live, order, source.email)
  const sale = live.transactions.find(tx => tx.status === 'SUCCESS' && ['SALE', 'CAPTURE'].includes(tx.kind))
  requireThat(sale?.amountSet?.shopMoney?.currencyCode === 'USD' && Number(sale.amountSet.shopMoney.amount) * 100 === offer.amount
    && live.totalTaxSet?.shopMoney?.currencyCode === 'USD' && Number(live.totalTaxSet.shopMoney.amount) === 0,
  'The Shopify external transaction or tax does not match the original order')
  requireThat(!order.shipping.phone || addressKey(order.shipping.phone) === addressKey(live.shippingAddress.phone),
    'The Shopify recipient phone differs from the original order')
  const match = /^gid:\/\/shopify\/Order\/(\d+)$/.exec(live.id)
  requireThat(match, 'Missing Shopify order ID')
  const sync = await db.rpc('sync_shopify_stripe_bundle_shipments', {
    p_order: order.id, p_shopify_ref: `${shop}/${match[1]}`, p_shopify_updated_at: live.updatedAt, p_packs: packs,
  })
  requireThat(!sync.error, 'Production reconciliation rejected the Shopify order or shipment snapshot')
  const splits = mode === 'split' ? await splitOutstandingPacks(api, live.id, offer.skus) : undefined
  console.log(JSON.stringify({ result: mode, shopifyOrderId: match[1], packUpdates: sync.data, outstandingPackGroups: splits }))
}

main().catch(error => {
  console.error(error.constructor === Error && !error.cmd ? error.message : 'Source data or API check failed')
  process.exitCode = 1
})
