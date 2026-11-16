import { createHmac, timingSafeEqual } from 'node:crypto'
import { shipmentStates } from '../../scripts/shopify/initial-pilot-order.mjs'
import { isInitiationShippingRegion } from './initiation-checkout-policy'
import { INITIATION_PRICES } from './initiation-pricing'

export const shopifyLiveCheckoutAttribute = '_putopia_live_reservation'
const packSkus = ['INITIAL-PACK-1', 'INITIAL-PACK-2', 'COMPLETE-PACK-3', 'COMPLETE-PACK-4']
const allowedTopics = new Set(['orders/create', 'orders/paid', 'orders/updated', 'orders/cancelled', 'refunds/create', 'fulfillments/create', 'fulfillments/update'])
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

type ShopifyReservation = {
  id: string
  userId: string
  shop: string
  email: string
  kind: 'initial' | 'standard'
  variantId: string
}
type Money = { amount: string; currencyCode: string }
type MoneyBag = { shopMoney: Money; presentmentMoney: Money }
type Connection<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean } }
type Address = { name: string | null; address1: string | null; address2: string | null; city: string | null; provinceCode: string | null; zip: string | null; countryCodeV2: string | null }
type Transaction = { id: string; kind: string; status: string; test: boolean; gateway: string; amountSet: MoneyBag; processedAt: string | null; parentTransaction: { id: string } | null }
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
  lineItems: Connection<{ id: string; sku: string | null; quantity: number; requiresShipping: boolean; lineItemGroup: { id: string; quantity: number; variantId: string } | null }>
  transactions: Transaction[]
  refunds: unknown[]
  fulfillments: Parameters<typeof shipmentStates>[0]
}

export class ShopifyOrderReview extends Error {}

function requireMatch(ok: unknown, message: string): asserts ok {
  if (!ok) throw new ShopifyOrderReview(message)
}

export function shopifyLiveReservationReference(reservation: ShopifyReservation, secret: string) {
  const signed = createHmac('sha256', secret).update(JSON.stringify([
    reservation.shop, reservation.id, reservation.userId, reservation.email.trim().toLowerCase(), reservation.kind, reservation.variantId,
  ])).digest('hex')
  return `${reservation.id}.${signed}`
}

export function shopifyLiveReservationId(reference: string | null | undefined) {
  if (!reference) return null
  const [id, signature, ...rest] = reference.split('.')
  return !rest.length && uuidPattern.test(id) && /^[0-9a-f]{64}$/.test(signature) ? id : null
}

export function verifyShopifyLiveWebhook(body: string, headers: Headers, { shop, secret }: { shop:string; secret:string }) {
  const topic = headers.get('x-shopify-topic')
  const signature = headers.get('x-shopify-hmac-sha256')
  if (!topic || !allowedTopics.has(topic) || headers.get('x-shopify-shop-domain') !== shop
    || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return null
  const expected = createHmac('sha256', secret).update(body, 'utf8').digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'base64')) ? topic : null
}

function exactCents(bag: MoneyBag | undefined) {
  const cents = (money: Money | undefined) => {
    requireMatch(money?.currencyCode === 'USD' && /^\d+(?:\.\d{1,2})?$/.test(money.amount), 'Expected a USD amount')
    const [integer, decimal = ''] = money.amount.split('.')
    return Number(integer) * 100 + Number(decimal.padEnd(2, '0'))
  }
  const shopCents = cents(bag?.shopMoney)
  requireMatch(shopCents === cents(bag?.presentmentMoney), 'Shop and payment currencies or amounts do not match')
  return shopCents
}

export function verifyShopifyLiveOrder(order: ShopifyLiveOrder, reservation: ShopifyReservation, referenceSecret: string) {
  requireMatch(order?.test === false && /^gid:\/\/shopify\/Order\/\d+$/.test(order.id), 'A formal Shopify order is required')
  requireMatch(order.cancelledAt === null && order.refunds.length === 0, 'Cancelled or refunded orders need reconciliation')
  const references = order.customAttributes.filter(item => item.key === shopifyLiveCheckoutAttribute)
  const expectedReference = shopifyLiveReservationReference(reservation, referenceSecret)
  requireMatch(references.length === 1 && references[0].value === expectedReference
    && order.email?.trim().toLowerCase() === reservation.email.trim().toLowerCase(), 'The Shopify order does not match the customer reservation')
  const amount = INITIATION_PRICES[reservation.kind].amount
  requireMatch(exactCents(order.totalPriceSet) === amount && exactCents(order.currentTotalPriceSet) === amount
    && exactCents(order.totalShippingPriceSet) === 0 && exactCents(order.totalDiscountsSet) === 0, 'The Shopify bundle total or shipping charge changed')

  const address = order.shippingAddress
  requireMatch(address, 'A Shopify delivery address is required')
  requireMatch(address.name?.trim() && address.address1?.trim() && address.city?.trim()
    && /^\d{5}(?:-\d{4})?$/.test(address.zip ?? '') && isInitiationShippingRegion({ country: address.countryCodeV2, state: address.provinceCode }),
  'The order requires a complete delivery address in the contiguous US or DC')
  const shipping = { name: address.name, address: { line1: address.address1, line2: address.address2, city: address.city, state: address.provinceCode,
    postal_code: address.zip, country: address.countryCodeV2 } }

  const expectedSkus = packSkus.slice(0, reservation.kind === 'initial' ? 2 : 4)
  const lines = order.lineItems.nodes
  const group = lines[0]?.lineItemGroup?.id
  requireMatch(!order.lineItems.pageInfo.hasNextPage && !!group && lines.length === expectedSkus.length, 'The reserved Shopify bundle is missing Pack items')
  const positions = new Map()
  for (const line of lines) {
    const position = expectedSkus.indexOf(line.sku ?? '') + 1
    requireMatch(position > 0 && line.quantity === 1 && line.requiresShipping
      && line.lineItemGroup?.id === group && line.lineItemGroup.variantId === reservation.variantId && line.lineItemGroup.quantity === 1,
    'Each required Pack must belong to the reserved Shopify bundle')
    positions.set(line.id, position)
  }
  requireMatch(new Set(positions.values()).size === expectedSkus.length, 'The Shopify order contains duplicate Pack items')
  requireMatch(order.transactions.length < 20, 'Too many payment transactions to reconcile')
  const transactions = order.transactions.filter(transaction => transaction.status === 'SUCCESS')
  const payments = transactions.filter(transaction => ['AUTHORIZATION','SALE','CAPTURE','VOID','REFUND'].includes(transaction.kind))
  requireMatch(payments.every(transaction => transaction.test === false && transaction.gateway === 'shopify_payments'
    && /^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(transaction.id)), 'Order has a test transaction or an unexpected payment gateway')
  const authorization = payments.find(transaction => transaction.kind === 'AUTHORIZATION')
  requireMatch(!!authorization && exactCents(authorization.amountSet) === amount, 'A matching Shopify Payments authorization is required')
  if (payments.length === 1 && order.displayFinancialStatus === 'AUTHORIZED') {
    requireMatch(!order.transactions.some(transaction => transaction.kind === 'CAPTURE' && transaction.status === 'PENDING'),
      'The Shopify capture is still pending')
    return { state: 'authorized' as const, orderId: order.id, authorization: authorization.id, amount, shipping }
  }
  const capture = payments.find(transaction => transaction.kind === 'CAPTURE')
  requireMatch(order.displayFinancialStatus === 'PAID' && payments.length === 2 && capture?.processedAt
    && capture.parentTransaction?.id === authorization.id && exactCents(capture.amountSet) === amount,
  'The authorization has not been captured in full')
  return { state: 'paid' as const, orderId: order.id, authorization: authorization.id, capture: capture.id, paidAt: capture.processedAt, amount, shipping,
    updatedAt: order.updatedAt, packs: shipmentStates(order.fulfillments, positions) }
}
