import { isInitiationShippingRegion } from '../../src/lib/initiation-checkout-policy.ts'

export const INITIAL_PILOT_QUERY = `
  query ShopifyPilotOrder($id: ID!, $isComplete: Boolean! = false) {
    order(id: $id) {
      id test email updatedAt cancelledAt displayFinancialStatus
      customAttributes { key value }
      shippingAddress {
        countryCodeV2 provinceCode zip
        name @include(if: $isComplete)
        address1 @include(if: $isComplete)
        address2 @include(if: $isComplete)
        city @include(if: $isComplete)
      }
      totalPriceSet { ...PilotMoney }
      currentTotalPriceSet { ...PilotMoney }
      totalShippingPriceSet { ...PilotMoney }
      totalDiscountsSet { ...PilotMoney }
      lineItems(first: 5) {
        nodes {
          id sku quantity requiresShipping originalUnitPriceSet { ...PilotMoney }
          lineItemGroup { id quantity variantId }
        }
        pageInfo { hasNextPage }
      }
      transactions(first: 20) { ...PilotTransaction }
      refunds {
        refundLineItems(first: 5) {
          nodes { quantity lineItem { id } }
          pageInfo { hasNextPage }
        }
        transactions(first: 5) {
          nodes { ...PilotTransaction }
          pageInfo { hasNextPage }
        }
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
  fragment PilotMoney on MoneyBag {
    shopMoney { amount currencyCode }
    presentmentMoney { amount currencyCode }
  }
  fragment PilotTransaction on OrderTransaction {
    id kind status test gateway processedAt parentTransaction { id }
    amountSet { ...PilotMoney }
  }
`

const offers = {
  initial: { amount: 3800, skus: ['INITIAL-PACK-1', 'INITIAL-PACK-2'], prices: [1900, 1900] },
  standard: { amount: 48800, skus: ['INITIAL-PACK-1', 'INITIAL-PACK-2', 'COMPLETE-PACK-3', 'COMPLETE-PACK-4'], prices: [1900, 1900, 45000, 0] },
}
const dispatched = new Set(['CARRIER_PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ATTEMPTED_DELIVERY'])
const successful = tx => tx.status === 'SUCCESS'
const paidKinds = new Set(['SALE', 'CAPTURE'])

function requireMatch(ok, message) {
  if (!ok) throw new Error(message)
}

function dollarsToCents(money) {
  requireMatch(money?.currencyCode === 'USD' && /^\d+(\.\d{1,2})?$/.test(money?.amount), 'Expected an exact USD amount')
  const [dollars, cents = ''] = money.amount.split('.')
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'))
}

function cents(bag) {
  const result = dollarsToCents(bag?.shopMoney)
  requireMatch(result === dollarsToCents(bag?.presentmentMoney), 'Shop and buyer currencies or amounts differ')
  return result
}

function complete(connection) {
  requireMatch(connection?.pageInfo?.hasNextPage === false, 'Incomplete Shopify data requires manual review')
  return connection.nodes
}

function trackingLink(value) {
  if (!value?.number || !value.url) return null
  const url = new URL(value.url)
  requireMatch(url.protocol === 'https:' && !url.username && !url.password, 'Use a secure carrier tracking URL')
  return url.href
}

function refundPositions(refunds, lineToPosition, payment) {
  const positions = new Set()
  for (const refund of refunds) {
    const transactions = complete(refund.transactions).filter(tx => tx.kind === 'REFUND')
    if (!transactions.some(successful)) continue
    requireMatch(transactions.every(tx => tx.status === 'SUCCESS' || tx.status === 'FAILURE' || tx.status === 'ERROR'), 'Wait until all refund transactions finish')
    const lines = complete(refund.refundLineItems)
    let confirmed = 0
    for (const tx of transactions.filter(successful)) {
      requireMatch(tx.test === true && tx.gateway === payment.gateway && tx.parentTransaction?.id === payment.id, 'Refund must reverse the verified Shopify Payments test charge')
      confirmed += cents(tx.amountSet)
    }
    requireMatch(lines.length > 0 && confirmed === lines.length * 1900, 'Refund must be $19 per selected Pack')
    for (const line of lines) {
      const position = lineToPosition.get(line.lineItem.id)
      requireMatch(position && line.quantity === 1 && !positions.has(position), 'Refund has ambiguous Pack allocation')
      positions.add(position)
    }
  }
  return [...positions].sort()
}

export function shipmentStates(fulfillments, lineToPosition) {
  const packs = Object.fromEntries([...lineToPosition.values()].map(position => [position, { status: 'planned', trackingUrl: null, trackingNumber: null }]))
  const trackingNumbers = new Set()
  requireMatch(fulfillments.length < 10, 'Too many fulfillments for the pilot')
  for (const shipment of fulfillments) {
    if (shipment.status === 'CANCELLED' || shipment.displayStatus === 'CANCELED' || shipment.displayStatus === 'LABEL_VOIDED') continue
    requireMatch(shipment.status === 'SUCCESS', 'Wait for fulfillment creation to succeed')
    const lines = complete(shipment.fulfillmentLineItems)
    const position = lineToPosition.get(lines[0]?.lineItem.id)
    requireMatch(lines.length === 1 && lines[0].quantity === 1 && position && packs[position].status === 'planned', 'Fulfill each Pack separately')
    requireMatch(shipment.trackingInfo.length <= 1, 'Use one tracking number per Pack')
    const tracking = shipment.trackingInfo[0]
    const trackingNumber = tracking?.number?.trim() || null
    if (trackingNumber) {
      requireMatch(/^[A-Za-z0-9 .-]{1,128}$/.test(trackingNumber) && !trackingNumbers.has(trackingNumber),
        'The Packs must have distinct valid tracking numbers')
      trackingNumbers.add(trackingNumber)
    }
    const trackingUrl = trackingLink(tracking)
    const delivered = shipment.deliveredAt || shipment.displayStatus === 'DELIVERED'
    const handedOff = shipment.inTransitAt || dispatched.has(shipment.displayStatus)
    requireMatch((trackingNumber && trackingUrl) || (!delivered && !handedOff), 'A tracked dispatch needs a tracking number and carrier URL')
    packs[position] = { status: delivered ? 'delivered' : handedOff ? 'dispatched' : 'preparing', trackingUrl, trackingNumber }
  }
  return packs
}

export function readPilotOrder(order, { orderId, email, kind = 'initial', bundle }) {
  const offer = kind === 'initial' || kind === 'standard' ? offers[kind] : null
  requireMatch(offer, 'Unknown Shopify pilot offer')
  const price = offer.amount / 100
  requireMatch(order?.id === orderId && order.test === true, 'Only the specified Shopify test order is allowed')
  if (bundle?.checkout) {
    const references = order.customAttributes?.filter(attr => attr.key === bundle.checkout.key) ?? []
    requireMatch(references.length === 1 && references[0].value === bundle.checkout.reference, 'Shopify order does not match this Putopia checkout')
  } else {
    requireMatch(order.email && order.email.trim().toLowerCase() === email.trim().toLowerCase(), 'Shopify checkout email must match the confirmed Putopia test account')
  }
  const address = order.shippingAddress
  requireMatch(isInitiationShippingRegion({ country: address?.countryCodeV2, state: address?.provinceCode }) && /^\d{5}(-\d{4})?$/.test(address?.zip), 'Use a shipping address in the 48 contiguous states or DC')
  requireMatch(cents(order.totalPriceSet) === offer.amount && cents(order.totalShippingPriceSet) === 0 && cents(order.totalDiscountsSet) === 0, `Use the $${price} USD total with included shipping and tax`)
  const lines = complete(order.lineItems)
  requireMatch(lines.length === offer.skus.length, `The $${price} test order must contain exactly ${offer.skus.length} Pack lines`)
  const groupId = lines[0]?.lineItemGroup?.id
  const lineToPosition = new Map()
  for (const line of lines) {
    const index = offer.skus.indexOf(line.sku)
    requireMatch(index !== -1 && line.quantity === 1 && line.requiresShipping, 'Use one physical unit of each configured Pack')
    if (bundle) {
      const group = line.lineItemGroup
      requireMatch(groupId && group?.id === groupId && group.variantId === bundle.variantId && group.quantity === 1, 'Expected one instance of the configured Shopify bundle')
    } else {
      requireMatch(cents(line.originalUnitPriceSet) === offer.prices[index], 'Use the configured Pack test price')
    }
    lineToPosition.set(line.id, index + 1)
  }
  requireMatch(new Set(lineToPosition.values()).size === offer.skus.length, kind === 'initial' ? 'Order must contain one Pack 1 and one Pack 2' : 'Order must contain one of each of the four Packs')

  requireMatch(order.transactions.length < 20, 'Too many payment attempts for the pilot')
  const payments = order.transactions.filter(tx => successful(tx) && paidKinds.has(tx.kind))
  requireMatch(payments.length === 1, 'Wait for one successful test charge or manual capture before activation')
  const payment = payments[0]
  requireMatch(payment.test === true && payment.gateway === 'shopify_payments' && cents(payment.amountSet) === offer.amount && payment.processedAt, `Expected a successful $${price} Shopify Payments test capture`)
  if (kind === 'standard') {
    requireMatch(order.refunds.length === 0, 'The Complete pilot requires an unrefunded test order')
    requireMatch([address.name, address.address1, address.city].every(value => value?.trim()), 'Complete Console claims require a valid checkout shipping address')
  }
  const refundedPacks = kind === 'initial' ? refundPositions(order.refunds, lineToPosition, payment) : []
  const expectedStatus = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'][refundedPacks.length]
  requireMatch(order.displayFinancialStatus === expectedStatus, 'Payment and refund evidence disagree. Check the Shopify order timeline')
  return {
    paidAt: payment.processedAt,
    updatedAt: order.updatedAt,
    refundedPacks,
    ...(kind === 'standard' && { shipping: { name: address.name, address: {
      line1: address.address1, line2: address.address2, city: address.city, state: address.provinceCode,
      postal_code: address.zip, country: address.countryCodeV2,
    } } }),
    packs: shipmentStates(order.fulfillments, lineToPosition),
  }
}
