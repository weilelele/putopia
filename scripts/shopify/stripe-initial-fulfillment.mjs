import { isInitiationShippingRegion } from '../../src/lib/initiation-checkout-policy.ts'

export const INITIAL_PACK_SKUS = ['INITIAL-PACK-1', 'INITIAL-PACK-2']
export const CURRENT_STRIPE_BUNDLES = Object.freeze({
  initial: { amount: 3800, skus: INITIAL_PACK_SKUS, prices: [1900, 1900] },
  standard: { amount: 48800, skus: [...INITIAL_PACK_SKUS, 'COMPLETE-PACK-3', 'COMPLETE-PACK-4'], prices: [1900, 1900, 45000, 0] },
})
const carrierDispatch = new Set(['CARRIER_PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ATTEMPTED_DELIVERY'])

function requireMatch(condition, message) {
  if (!condition) throw new Error(message)
}

function complete(connection) {
  requireMatch(connection?.pageInfo?.hasNextPage === false, 'Shopify data was truncated; review the order manually')
  return connection.nodes
}

export function stripeOrderTag(id) {
  return `mc-stripe-${id}`
}

export function checkCapturedInitial(order, intent) {
  requireMatch(order?.order_kind === 'initial', 'Use a paid live Stripe $38 Initial order')
  checkCapturedStripeBundle(order, intent)
}

export function checkCapturedStripeBundle(order, intent, session) {
  const offer = Object.hasOwn(CURRENT_STRIPE_BUNDLES, order?.order_kind) ? CURRENT_STRIPE_BUNDLES[order.order_kind] : null
  requireMatch(offer && order.status === 'paid' && order.amount === offer.amount
    && order.currency === 'usd' && order.pricing_version === 'voyager-bundles-v1'
    && order.paid_at && order.stripe_livemode === true, 'Use a paid live Stripe Initial or Complete order')
  const charge = intent?.latest_charge
  const buyerMatches = session
    ? session.id === order.stripe_session_id && session.payment_intent === intent?.id
      && session.metadata?.order_id === order.id && session.metadata?.order_kind === order.order_kind
      && session.metadata?.user_id === order.user_id && session.client_reference_id === order.user_id
    : intent?.metadata?.user_id === order.user_id
  requireMatch(intent?.id === order.stripe_payment_intent && intent.livemode === true
    && intent.status === 'succeeded' && intent.amount_received === offer.amount && intent.currency === 'usd'
    && intent.metadata?.order_id === order.id && buyerMatches
    && intent.metadata?.order_kind === order.order_kind
    && charge?.status === 'succeeded' && charge.captured === true && charge.amount_captured === offer.amount
    && charge.amount_refunded === 0 && charge.disputed === false, 'Stripe must confirm the original amount captured with zero refunds and no dispute')
  const address = order.shipping?.address
  requireMatch(order.shipping?.name && address?.line1 && address.city && /^\d{5}(-\d{4})?$/.test(address.postal_code)
    && isInitiationShippingRegion({ country: address.country, state: address.state }), 'The existing order needs a complete eligible U.S. shipping address')
}

function orderAddressMatches(local, remote) {
  const address = local.shipping.address
  const clean = value => (value ?? '').trim().toUpperCase().replace(/[^\p{L}\p{N}]/gu, '')
  return [[local.shipping.name, remote?.name], [address.line1, remote?.address1], [address.line2, remote?.address2],
    [address.city, remote?.city], [address.state, remote?.provinceCode], [address.postal_code, remote?.zip],
    [address.country, remote?.countryCodeV2]].every(([a, b]) => clean(a) === clean(b))
}

export function readShopifyShipments(shopifyOrder, local, email) {
  const offer = Object.hasOwn(CURRENT_STRIPE_BUNDLES, local.order_kind) ? CURRENT_STRIPE_BUNDLES[local.order_kind] : null
  requireMatch(offer, 'Unsupported Stripe bundle')
  requireMatch(shopifyOrder?.test === false && shopifyOrder.cancelledAt === null
    && shopifyOrder.tags.includes(stripeOrderTag(local.id)), 'Use the live Shopify order tagged with the selected Stripe order reference')
  requireMatch(shopifyOrder.displayFinancialStatus === 'PAID' && shopifyOrder.totalPriceSet?.shopMoney?.currencyCode === 'USD'
    && Number(shopifyOrder.totalPriceSet.shopMoney.amount) * 100 === offer.amount, 'Shopify must record the original amount as externally paid')
  const payments = shopifyOrder.transactions.filter(tx => tx.status === 'SUCCESS' && ['SALE', 'CAPTURE'].includes(tx.kind))
  requireMatch(shopifyOrder.transactions.length < 5 && payments.length === 1
    && (payments[0].manualPaymentGateway || payments[0].gateway === 'manual') && payments[0].test === false,
  'Record the existing external payment as a Shopify manual payment')
  requireMatch(shopifyOrder.email?.trim().toLowerCase() === email.trim().toLowerCase()
    && orderAddressMatches(local, shopifyOrder.shippingAddress), 'Shopify recipient details do not match the original order')
  const lines = complete(shopifyOrder.lineItems)
  const packByLine = new Map(lines.map(line => [line.id, offer.skus.indexOf(line.sku) + 1]))
  requireMatch(lines.length === offer.skus.length && lines.every(line => line.quantity === 1 && line.requiresShipping)
    && offer.skus.every((_, index) => [...packByLine.values()].includes(index + 1)), 'Use exactly one physical unit of each Pack SKU for this bundle')

  const packs = {}
  const trackingNumbers = new Set()
  requireMatch(shopifyOrder.fulfillments.length < 10, 'Too many Shopify fulfillments to reconcile')
  for (const fulfillment of shopifyOrder.fulfillments) {
    if (fulfillment.status === 'CANCELLED' || ['CANCELED', 'LABEL_VOIDED'].includes(fulfillment.displayStatus)) continue
    requireMatch(fulfillment.status === 'SUCCESS', 'Wait for Shopify to finish creating the fulfillment')
    const items = complete(fulfillment.fulfillmentLineItems)
    const position = packByLine.get(items[0]?.lineItem.id)
    requireMatch(items.length === 1 && items[0].quantity === 1 && position && !packs[position],
      'Split the Packs into separate fulfillments in Shopify')
    requireMatch(fulfillment.trackingInfo.length <= 1, 'Use a single tracking number per fulfillment')
    const info = fulfillment.trackingInfo[0]
    const trackingNumber = info?.number?.trim() || null
    const trackingUrl = info?.url ? new URL(info.url) : null
    requireMatch(!trackingNumber || (/^[A-Za-z0-9 .-]{1,128}$/.test(trackingNumber) && !trackingNumbers.has(trackingNumber)),
      'Use distinct valid tracking numbers for the Packs')
    requireMatch(!trackingUrl || (trackingUrl.protocol === 'https:' && !trackingUrl.username && !trackingUrl.password),
      'Use a secure carrier tracking URL')
    if (trackingNumber) trackingNumbers.add(trackingNumber)

    const status = fulfillment.deliveredAt || fulfillment.displayStatus === 'DELIVERED' ? 'delivered'
      : fulfillment.inTransitAt || carrierDispatch.has(fulfillment.displayStatus) ? 'dispatched' : 'preparing'
    requireMatch(status === 'preparing' || (trackingNumber && trackingUrl), 'Carrier updates need the tracking number and URL')
    packs[position] = { status, trackingNumber, trackingUrl: trackingUrl?.href ?? null }
  }
  return packs
}
