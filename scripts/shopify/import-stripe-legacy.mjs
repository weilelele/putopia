import {
  addressKey, createOrder, lookupOrder, money, productionDb, requireThat,
  scopeNames, shop, shopifyApi, stripeReader,
} from './import-stripe-bundle.mjs'
import { stripeOrderTag } from './stripe-initial-fulfillment.mjs'

const sku = 'VOYAGER-PACK-LEGACY'
const amount = 1200
const statuses = ['paid', 'preparing', 'shipped', 'delivered']
const batchTag = 'Putopia legacy Voyager import'
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const addressFields = ['line1','line2','city','state','postal_code','country']

function checkMoney(value, cents) {
  return value?.shopMoney?.currencyCode === 'USD' && Number(value.shopMoney.amount) * 100 === cents
}

async function loadSource(db, stripe, row) {
  const { id, stripe_session_id: sessionId, stripe_payment_intent: intentId } = row
  requireThat(/^cs_live_[A-Za-z0-9]+$/.test(sessionId) && /^pi_[A-Za-z0-9]+$/.test(intentId), 'Missing live Stripe references')
  const [session, intent, refunds] = await Promise.all([
    stripe.session(sessionId), stripe.intent(intentId),
    db.from('initiation_refund_state').select('refunded_amount,disputed').eq('payment_intent', intentId).maybeSingle(),
  ])
  const charge = intent.latest_charge
  requireThat(!refunds.error && !refunds.data?.disputed && !(refunds.data?.refunded_amount > 0)
    && intent.id === intentId && intent.livemode && intent.status === 'succeeded' && intent.currency === 'usd'
    && intent.amount_received === amount && charge?.status === 'succeeded' && charge.captured
    && charge.amount_captured === amount && charge.amount_refunded === 0 && charge.disputed === false,
  'Stripe capture, refund or dispute mismatch')
  requireThat(session.id === sessionId && session.payment_intent === intentId && session.livemode
    && session.status === 'complete' && session.mode === 'payment' && session.payment_status === 'paid'
    && session.amount_total === amount && session.currency === 'usd'
    && (!session.metadata?.order_id || session.metadata.order_id === id),
  'Stripe Checkout session mismatch')
  requireThat((session.total_details?.amount_shipping ?? 0) === 0 && (session.total_details?.amount_tax ?? 0) === 0,
    'The legacy order has separately charged shipping or tax')

  const shippingDetails = session.collected_information?.shipping_details ?? session.shipping_details ?? session.customer_details
  const email = row.email?.trim().toLowerCase()
  const stripeEmail = (session.customer_details?.email ?? session.customer_email)?.trim().toLowerCase()
  const address = {
    line1: row.address_line1, line2: row.address_line2, city: row.city,
    state: row.state, postal_code: row.postal_code, country: row.country,
  }
  for (const key of ['line1','city','state','postal_code','country']) {
    requireThat(typeof address[key] === 'string' && address[key].trim(), 'Missing shipping address')
  }
  requireThat(row.recipient_name?.trim() && email && email === stripeEmail
    && addressKey(row.recipient_name) === addressKey(shippingDetails?.name)
    && addressFields.every(key => addressKey(address[key]) === addressKey(shippingDetails?.address?.[key])),
  'Original Stripe email or address mismatch')

  const isShipped = ['shipped','delivered'].includes(row.status)
  const tracking = row.tracking_number?.trim()
  const url = row.tracking_url ? new URL(row.tracking_url) : null
  requireThat(row.pack_count === 1 && row.paid_at && row.currency.toLowerCase() === 'usd'
    && (isShipped ? row.shipped_at && tracking && url?.protocol === 'https:' && !url.username && !url.password
      : !tracking && !url && !row.shipped_at), 'The original single-Pack fulfillment needs manual reconciliation')
  return {
    order: { id, paid_at: row.paid_at, shipping: { name: row.recipient_name, address, phone: row.phone } },
    email, offer: { amount }, row, isShipped, tracking, url,
    lineItems: [{ sku, title: 'Voyager Pack', priceSet: money(amount), quantity: 1, requiresShipping: true }],
    tags: [batchTag],
  }
}

function verifyOrder(order, source) {
  const local = source.order.shipping
  const address = order?.shippingAddress
  const line = order?.lineItems?.nodes[0]
  const payments = order?.transactions.filter(tx => tx.status === 'SUCCESS' && ['SALE','CAPTURE'].includes(tx.kind))
  requireThat(order?.test === false && order.cancelledAt === null && order.tags.includes(batchTag) && order.tags.includes(stripeOrderTag(source.order.id))
    && order.displayFinancialStatus === 'PAID' && checkMoney(order.totalPriceSet, amount) && checkMoney(order.totalTaxSet, 0)
    && payments.length === 1 && payments[0].test === false && payments[0].gateway === 'manual' && checkMoney(payments[0].amountSet, amount)
    && order.email?.trim().toLowerCase() === source.email
    && [[local.name,address?.name],[local.address.line1,address?.address1],[local.address.line2,address?.address2],
      [local.address.city,address?.city],[local.address.state,address?.provinceCode],[local.address.postal_code,address?.zip],
      [local.address.country,address?.countryCodeV2],...(local.phone ? [[local.phone,address?.phone]] : [])]
      .every(([a,b]) => addressKey(a) === addressKey(b))
    && !order.lineItems.pageInfo.hasNextPage && order.lineItems.nodes.length === 1
    && line?.sku === sku && line.quantity === 1 && line.requiresShipping,
  'Shopify order did not match the source payment, address and Pack')
}

async function checkFulfillment(api, source, order, apply) {
  const { order: remote } = await api(`query($id:ID!){order(id:$id){displayFulfillmentStatus
    fulfillmentOrders(first:5){nodes{id status assignedLocation{zip countryCode} lineItems(first:5){nodes{id sku remainingQuantity}}}}
    fulfillments(first:5){id status trackingInfo(first:2){number url company}}
  }}`, { id: order.id })
  const fulfillments = remote.fulfillments.filter(item => item.status !== 'CANCELLED')
  if (fulfillments.length) {
    const tracking = fulfillments[0].trackingInfo
    requireThat(source.isShipped && fulfillments.length === 1 && remote.displayFulfillmentStatus === 'FULFILLED'
      && tracking.length === 1 && tracking[0].number === source.tracking && tracking[0].url === source.url.href,
    'Shopify fulfillment does not match the historical shipment')
    return 'shipped'
  }
  const groups = remote.fulfillmentOrders.nodes
  const group = groups[0]
  const items = group?.lineItems.nodes
  requireThat(remote.displayFulfillmentStatus === 'UNFULFILLED' && groups.length === 1 && group.status === 'OPEN'
    && group.assignedLocation.zip === '95054' && group.assignedLocation.countryCode === 'US'
    && items.length === 1 && items[0].sku === sku && items[0].remainingQuantity === 1,
  'Shopify did not assign the original Pack to the 95054 fulfillment location')
  if (!source.isShipped || !apply) return 'pending'
  const { fulfillmentCreate } = await api(`mutation($input:FulfillmentInput!){
    fulfillmentCreate(fulfillment:$input){fulfillment{id} userErrors{field}}
  }`, { input: {
    notifyCustomer: false,
    trackingInfo: { number: source.tracking, url: source.url.href, company: source.row.carrier || undefined },
    lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: group.id, fulfillmentOrderLineItems: [{ id: items[0].id, quantity: 1 }] }],
  } })
  requireThat(fulfillmentCreate.fulfillment?.id && !fulfillmentCreate.userErrors.length, 'Shopify rejected the historical fulfillment record')
  return checkFulfillment(api, source, order, false)
}

async function main() {
  const [mode, ...ids] = process.argv.slice(2)
  requireThat(['prepare','apply','verify'].includes(mode) && ids.every(id => uuidPattern.test(id))
    && (mode === 'prepare' || ids.length > 0), 'Usage: prepare [source UUIDs] or <apply|verify> <source UUIDs>')
  const db = productionDb()
  const stripe = stripeReader()
  const query = db.from('voyager_orders').select('id,email,status,amount,currency,paid_at,pack_count,recipient_name,address_line1,address_line2,city,state,postal_code,country,phone,carrier,tracking_number,tracking_url,shipped_at,stripe_session_id,stripe_payment_intent')
    .eq('product_type','voyager_pack').eq('amount',amount).in('status',statuses).order('paid_at').order('id')
  const rows = await (ids.length ? query.in('id',ids) : query.limit(500))
  requireThat(!rows.error && rows.data.length > 0 && (!ids.length || rows.data.length === new Set(ids).size), 'Failed to load the exact historical orders')
  const api = mode === 'prepare' ? null : await shopifyApi()
  if (mode === 'apply') {
    const { currentAppInstallation } = await api('{currentAppInstallation{accessScopes{handle}}}')
    requireThat(scopeNames.every(scope => currentAppInstallation.accessScopes.some(grant => grant.handle === scope)), 'Shopify write permissions missing')
  }
  const seenPayments = new Set()
  const eligible = []
  const parked = {}
  // Bounded read-only verification. Never create while a source cohort is being scanned.
  for (let index = 0; index < rows.data.length; index += 4) {
    const sources = await Promise.allSettled(rows.data.slice(index,index + 4).map(row => loadSource(db,stripe,row)))
    for (const result of sources) {
      if (result.status === 'rejected') {
        const error = result.reason
        const reason = error.constructor === Error && !error.cmd && !error.cause ? error.message : 'Stripe or source read failed'
        parked[reason] = (parked[reason] ?? 0) + 1
        continue
      }
      const source = result.value
      requireThat(!seenPayments.has(source.row.stripe_payment_intent), 'Two source records use the same Stripe payment')
      seenPayments.add(source.row.stripe_payment_intent)
      eligible.push(source)
    }
  }
  if (mode === 'prepare') {
    console.log(JSON.stringify({ checked:rows.data.length, eligible:eligible.map(s=>({ id:s.order.id, shipped:s.isShipped })), parked }))
    return
  }
  requireThat(eligible.length === rows.data.length, 'A selected legacy source order no longer passes verification')
  for (const source of eligible) {
    const id = source.order.id
    const link = await db.from('voyager_shopify_imports').select('shop,shopify_order_id').eq('order_id',id).maybeSingle()
    requireThat(!link.error && (!link.data || link.data.shop === shop), 'Legacy order links to an unexpected Shopify shop')
    const linkedId = link.data?.shopify_order_id
    let order = await lookupOrder(api,source.order,linkedId ? `gid://shopify/Order/${linkedId}` : undefined)
    if (!order && mode === 'apply') {
      const reserve = await db.rpc('reserve_shopify_legacy_order_import',{ p_order:id,p_shop:shop })
      requireThat(!reserve.error && reserve.data === true, 'Legacy order reserved or no longer eligible. Reconcile the Shopify tag before retrying')
      order = await lookupOrder(api,source.order,await createOrder(api,source))
    }
    verifyOrder(order,source)
    const state = await checkFulfillment(api,source,order,mode === 'apply')
    requireThat(source.isShipped === (state === 'shipped'), 'The historical fulfillment did not finish reconciling')
    if (mode === 'apply') {
      const linked = await db.rpc('link_shopify_legacy_order_import',{ p_order:id,p_shop:shop,p_shopify_id:order.id.split('/').at(-1) })
      requireThat(!linked.error, 'Could not record the legacy Shopify link')
    }
    console.log(JSON.stringify({ source:id,shopifyId:order.id.split('/').at(-1),cents:amount,addressMatches:true,packCount:1,state }))
  }
}

main().catch(error => {
  console.error(error.constructor === Error && !error.cmd && !error.cause ? error.message : 'Legacy import verification failed')
  process.exitCode = 1
})
