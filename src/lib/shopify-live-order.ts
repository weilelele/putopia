import { createHmac, timingSafeEqual } from 'node:crypto'
import { shipmentStates } from '../../scripts/shopify/initial-pilot-order.mjs'
import { isInitiationShippingRegion } from './initiation-checkout-policy'
import { INITIATION_PRICES, isInitiationOrderAmount, type InitiationOrderKind } from './initiation-pricing'

export const shopifyLiveCheckoutAttribute = '_putopia_live_reservation'
const packSkus = ['INITIAL-PACK-1', 'INITIAL-PACK-2', 'COMPLETE-PACK-3', 'COMPLETE-PACK-4']
const allowedTopics = new Set(['orders/create', 'orders/paid', 'orders/updated', 'orders/cancelled', 'refunds/create', 'fulfillments/create', 'fulfillments/update'])
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export type ShopifyReservation = {
  id: string
  userId: string
  shop: string
  email: string
  kind: InitiationOrderKind
  variantId: string
  amount?: number
  pricingVersion?: string | null
  membershipOrderId?: string | null
  initialOrderId?: string | null
  referenceVersion?: number
}
type Money = { amount: string; currencyCode: string }
type MoneyBag = { shopMoney: Money; presentmentMoney: Money }
type Connection<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean } }
type Address = { name: string | null; address1: string | null; address2: string | null; city: string | null; provinceCode: string | null; zip: string | null; countryCodeV2: string | null }
type Transaction = { id: string; kind: string; status: string; test: boolean; gateway: string; amountSet: MoneyBag; processedAt: string | null; parentTransaction: { id: string } | null; createdAt?: string; errorCode?: string | null
  paymentDetails?: import('./shopify-payment-method').ShopifyPaymentDetails | null }
type Refund = { refundLineItems: Connection<{ quantity: number; lineItem: { id: string } }>; transactions: Connection<Transaction> }
export type ShopifyLiveOrder = {
  id: string
  test: boolean
  email: string | null
  updatedAt: string
  cancelledAt: string | null
  displayFinancialStatus: string
  customAttributes: { key: string; value: string }[]
  shippingAddress: Address | null
  totalPriceSet: MoneyBag
  currentTotalPriceSet: MoneyBag
  totalShippingPriceSet: MoneyBag
  totalDiscountsSet: MoneyBag
  lineItems: Connection<{ id: string; sku: string | null; quantity: number; requiresShipping: boolean; variant?: { id: string } | null; lineItemGroup: { id: string; quantity: number; variantId: string } | null }>
  transactions: Transaction[]
  refunds: Refund[]
  fulfillments: Parameters<typeof shipmentStates>[0]
}

export class ShopifyOrderReview extends Error {}
function requireMatch(ok: unknown, message: string): asserts ok {
  if (!ok) throw new ShopifyOrderReview(message)
}

export type ShopifyOrderIdentitySnapshot = { order?: { id?: unknown; line_items?: { id?: unknown; variant_id?: unknown }[] } }

/** Order snapshots require the existing read_orders scope; live ProductVariant relations require read_products. */
export function withShopifyOrderVariantIdentity(order: ShopifyLiveOrder, snapshot: ShopifyOrderIdentitySnapshot): ShopifyLiveOrder {
  const id = snapshot.order?.id
  const lines = snapshot.order?.line_items
  requireMatch(typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && order.id === `gid://shopify/Order/${id}`
    && Array.isArray(lines) && lines.length === order.lineItems.nodes.length && !order.lineItems.pageInfo.hasNextPage,
  'The Shopify order identity snapshot does not match')
  const variants = new Map<string, string>()
  for (const line of lines) {
    requireMatch(typeof line.id === 'number' && Number.isSafeInteger(line.id) && line.id > 0
      && typeof line.variant_id === 'number' && Number.isSafeInteger(line.variant_id) && line.variant_id > 0,
    'The Shopify order snapshot has invalid item identity')
    const lineId = `gid://shopify/LineItem/${line.id}`
    requireMatch(!variants.has(lineId), 'The Shopify order snapshot has duplicate items')
    variants.set(lineId, `gid://shopify/ProductVariant/${line.variant_id}`)
  }
  return { ...order, lineItems: { ...order.lineItems, nodes: order.lineItems.nodes.map(line => {
    const variant = variants.get(line.id)
    requireMatch(variant, 'The Shopify order snapshot is missing the reserved item')
    return { ...line, variant: { id: variant } }
  }) } }
}

export function shopifyLiveReservationReference(reservation: ShopifyReservation, secret: string) {
  const values: unknown[] = [reservation.shop, reservation.id, reservation.userId, reservation.email.trim().toLowerCase(), reservation.kind, reservation.variantId]
  if (reservation.referenceVersion === 2) values.push(reservation.amount, reservation.pricingVersion, reservation.membershipOrderId ?? null, reservation.initialOrderId ?? null)
  return `${reservation.id}.${createHmac('sha256', secret).update(JSON.stringify(values)).digest('hex')}`
}

export function shopifyLiveReservationId(reference: string | null | undefined) {
  if (!reference) return null
  const [id, signature, ...rest] = reference.split('.')
  return !rest.length && uuidPattern.test(id) && /^[0-9a-f]{64}$/.test(signature) ? id : null
}

export function verifyShopifyLiveWebhook(body: string, headers: Headers, { shop, secret }: { shop: string; secret: string }) {
  const topic = headers.get('x-shopify-topic')
  const signature = headers.get('x-shopify-hmac-sha256')
  if (!topic || !allowedTopics.has(topic) || headers.get('x-shopify-shop-domain') !== shop || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return null
  return timingSafeEqual(createHmac('sha256', secret).update(body, 'utf8').digest(), Buffer.from(signature, 'base64')) ? topic : null
}

function exactCents(bag: MoneyBag | undefined) {
  const cents = (money: Money | undefined) => {
    requireMatch(money?.currencyCode === 'USD' && /^\d+(?:\.\d{1,2})?$/.test(money.amount), 'Expected a USD amount')
    const [integer, decimal = ''] = money.amount.split('.')
    const amount = Number(integer) * 100 + Number(decimal.padEnd(2, '0'))
    requireMatch(Number.isSafeInteger(amount), 'Invalid payment amount')
    return amount
  }
  const amount = cents(bag?.shopMoney)
  requireMatch(amount === cents(bag?.presentmentMoney), 'Shop and payment currencies or amounts do not match')
  return amount
}

function orderShipping(order: ShopifyLiveOrder, digital: boolean) {
  if (digital) return null
  const address = order.shippingAddress
  requireMatch(address, 'A Shopify delivery address is required')
  requireMatch(address.name?.trim() && address.address1?.trim() && address.city?.trim()
    && /^\d{5}(?:-\d{4})?$/.test(address.zip ?? '') && isInitiationShippingRegion({ country: address.countryCodeV2, state: address.provinceCode }),
  'The order requires a complete delivery address in the contiguous US or DC')
  return { name: address.name, address: { line1: address.address1, line2: address.address2, city: address.city, state: address.provinceCode, postal_code: address.zip, country: address.countryCodeV2 } }
}

function orderPositions(order: ShopifyLiveOrder, reservation: ShopifyReservation) {
  const lines = order.lineItems.nodes
  requireMatch(!order.lineItems.pageInfo.hasNextPage, 'The reserved Shopify order has incomplete items')
  if (reservation.kind === 'membership') {
    requireMatch(lines.length === 1 && lines[0].sku === 'VOYAGER-MEMBERSHIP-S26' && lines[0].quantity === 1
      && !lines[0].requiresShipping && !lines[0].lineItemGroup && lines[0].variant?.id === reservation.variantId,
    'Expected the reserved digital Membership variant')
    return new Map<string, number>()
  }
  const expected = INITIATION_PRICES[reservation.kind].packs
  const group = lines[0]?.lineItemGroup?.id
  requireMatch(!!group && lines.length === expected.length, 'The reserved Shopify bundle is missing Pack items')
  const positions = new Map<string, number>()
  for (const line of lines) {
    const position = packSkus.indexOf(line.sku ?? '') + 1
    requireMatch((expected as readonly number[]).includes(position) && line.quantity === 1 && line.requiresShipping
      && line.lineItemGroup?.id === group && line.lineItemGroup.variantId === reservation.variantId && line.lineItemGroup.quantity === 1,
    'Each required Pack must belong to the reserved Shopify bundle')
    positions.set(line.id, position)
  }
  requireMatch(new Set(positions.values()).size === expected.length, 'The Shopify order contains duplicate Pack items')
  return positions
}

function orderRefunds(order: ShopifyLiveOrder, capture: Transaction, amount: number, positions: Map<string, number>) {
  let refundedAmount = 0
  let review = false
  let pendingRefund = false
  const refundedPacks = new Set<number>()
  const transactionIds = new Set<string>()
  for (const refund of order.refunds) {
    requireMatch(!refund.transactions.pageInfo.hasNextPage && !refund.refundLineItems.pageInfo.hasNextPage, 'Refund evidence is incomplete')
    pendingRefund ||= refund.transactions.nodes.some(tx => tx.kind === 'REFUND' && !['SUCCESS','FAILURE','ERROR'].includes(tx.status))
    let refundAmount = 0
    for (const tx of refund.transactions.nodes.filter(tx => tx.kind === 'REFUND' && tx.status === 'SUCCESS')) {
      requireMatch(!tx.test && tx.gateway === 'shopify_payments' && tx.parentTransaction?.id === capture.id
        && /^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(tx.id) && !transactionIds.has(tx.id), 'Refund must reverse the verified Shopify capture')
      transactionIds.add(tx.id)
      refundAmount += exactCents(tx.amountSet)
    }
    if (!refundAmount) continue
    refundedAmount += refundAmount
    for (const line of refund.refundLineItems.nodes) {
      const position = positions.get(line.lineItem.id)
      if (!position || line.quantity !== 1 || refundedPacks.has(position)) review = true
      else refundedPacks.add(position)
    }
    if (positions.size && refundAmount !== refund.refundLineItems.nodes.length * (amount / positions.size)) review = true
  }
  requireMatch(refundedAmount <= amount, 'Refund exceeds the verified payment')
  if (refundedAmount === amount) return { refundedAmount, refundedPacks: [...positions.values()], review: false, pendingRefund }
  return { refundedAmount, refundedPacks: [...refundedPacks], review, pendingRefund }
}

export function verifyShopifyLiveOrder(order: ShopifyLiveOrder, reservation: ShopifyReservation, referenceSecret: string) {
  requireMatch(order?.test === false && /^gid:\/\/shopify\/Order\/\d+$/.test(order.id), 'A formal Shopify order is required')
  const references = order.customAttributes.filter(item => item.key === shopifyLiveCheckoutAttribute)
  requireMatch(references.length === 1 && references[0].value === shopifyLiveReservationReference(reservation, referenceSecret)
    && order.email?.trim().toLowerCase() === reservation.email.trim().toLowerCase(), 'The Shopify order does not match the customer reservation')
  const amount = reservation.amount ?? INITIATION_PRICES[reservation.kind].amount
  if (reservation.referenceVersion === 2) requireMatch(isInitiationOrderAmount({ order_kind: reservation.kind, amount, pricing_version: reservation.pricingVersion, membership_order_id: reservation.membershipOrderId }), 'Invalid reserved quote')
  requireMatch(exactCents(order.totalPriceSet) === amount && exactCents(order.currentTotalPriceSet) <= amount
    && exactCents(order.totalShippingPriceSet) === 0, 'The Shopify bundle total or shipping charge changed')
  if (!order.refunds.length && !order.cancelledAt) requireMatch(exactCents(order.currentTotalPriceSet) === amount, 'The Shopify bundle total changed')
  if (reservation.referenceVersion !== 2) requireMatch(exactCents(order.totalDiscountsSet) === 0, 'The Shopify bundle discount changed')
  const shipping = orderShipping(order, reservation.kind === 'membership')
  const positions = orderPositions(order, reservation)
  requireMatch(order.transactions.length < 20, 'Too many payment transactions to reconcile')
  const payments = order.transactions.filter(tx => tx.status === 'SUCCESS' && ['AUTHORIZATION', 'SALE', 'CAPTURE', 'VOID'].includes(tx.kind))
  requireMatch(payments.every(tx => !tx.test && tx.gateway === 'shopify_payments' && /^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(tx.id)), 'Order has a test transaction or an unexpected payment gateway')
  const authorization = payments.find(tx => tx.kind === 'AUTHORIZATION')
  requireMatch(authorization && exactCents(authorization.amountSet) === amount, 'A matching Shopify Payments authorization is required')
  if (order.cancelledAt && !payments.some(tx => tx.kind === 'CAPTURE')) {
    return { state: 'canceled' as const, orderId: order.id, authorization: authorization.id, amount }
  }
  if (payments.length === 1 && order.displayFinancialStatus === 'AUTHORIZED') {
    requireMatch(!order.transactions.some(tx => tx.kind === 'CAPTURE' && tx.status === 'PENDING'), 'The Shopify capture is still pending')
    return { state: 'authorized' as const, orderId: order.id, authorization: authorization.id, amount, shipping }
  }
  const capture = payments.find(tx => tx.kind === 'CAPTURE')
  requireMatch(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.displayFinancialStatus) && payments.length === 2
    && capture?.processedAt && capture.parentTransaction?.id === authorization.id && exactCents(capture.amountSet) === amount,
  'The authorization has not been captured in full')
  const refunds = orderRefunds(order, capture, amount, positions)
  requireMatch(order.displayFinancialStatus !== 'PARTIALLY_REFUNDED' || (refunds.refundedAmount > 0 && refunds.refundedAmount < amount), 'Partial refund evidence is incomplete')
  requireMatch(order.displayFinancialStatus !== 'PAID' || refunds.refundedAmount === 0, 'Payment and refund state disagree')
  requireMatch(order.displayFinancialStatus !== 'REFUNDED' || refunds.refundedAmount === amount, 'Full refund evidence is incomplete')
  return { state: refunds.refundedAmount || order.cancelledAt ? 'reversed' as const : 'paid' as const,
    orderId: order.id, authorization: authorization.id, capture: capture.id, paidAt: capture.processedAt,
    amount, shipping, updatedAt: order.updatedAt, packs: positions.size ? shipmentStates(order.fulfillments, positions) : {},
    ...refunds, canceled: !!order.cancelledAt }
}
