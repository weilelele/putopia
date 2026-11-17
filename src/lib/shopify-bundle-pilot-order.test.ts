import { describe, expect, it } from 'vitest'
import { readPilotOrder } from '../../scripts/shopify/initial-pilot-order.mjs'

const orderId = 'gid://shopify/Order/101'
const variantId = 'gid://shopify/ProductVariant/202'
const checkout = { key: '_putopia_checkout', reference: 'reference-for-this-checkout' }
const testTime = '2026-11-15T00:00:00.000Z'
const lines = ['INITIAL-PACK-1', 'INITIAL-PACK-2']
const money = (amount: string) => {
  const usd = { amount, currencyCode: 'USD' }
  return { shopMoney: usd, presentmentMoney: usd }
}
const connection = <T,>(nodes: T[]) => ({ nodes, pageInfo: { hasNextPage: false } })

function fixedBundleOrder() {
  return {
    id: orderId,
    test: true,
    email: 'changed@example.com',
    updatedAt: testTime,
    displayFinancialStatus: 'PAID',
    customAttributes: [{ key: checkout.key, value: checkout.reference }],
    shippingAddress: { countryCodeV2: 'US', provinceCode: 'CA', zip: '95054' },
    totalPriceSet: money('38'),
    totalShippingPriceSet: money('0'),
    totalDiscountsSet: money('0'),
    lineItems: connection(lines.map((sku, index) => ({
      id: String(index + 1),
      sku,
      quantity: 1,
      requiresShipping: true,
      originalUnitPriceSet: money(index === 0 ? '20' : '18'),
      lineItemGroup: { id: 'bundle-group', quantity: 1, variantId },
    }))),
    transactions: [{ status: 'SUCCESS', kind: 'SALE', test: true, gateway: 'shopify_payments', amountSet: money('38'), processedAt: testTime }],
    refunds: [],
    fulfillments: [
      { status: 'SUCCESS', displayStatus: 'IN_TRANSIT', trackingInfo: [{ number: 'TEST-2', url: 'https://example.com/track/2' }], fulfillmentLineItems: connection([{ quantity: 1, lineItem: { id: '2' } }]) },
      { status: 'SUCCESS', displayStatus: 'CONFIRMED', trackingInfo: [{ number: 'TEST-1', url: 'https://example.com/track/1' }], fulfillmentLineItems: connection([{ quantity: 1, lineItem: { id: '1' } }]) },
    ],
  }
}

const input = { orderId, email: 'original@example.com', bundle: { checkout, variantId }, kind: 'initial' }

describe('Shopify fixed bundle pilot', () => {
  it('uses the signed checkout reference and maps each fulfillment to its Pack SKU', () => {
    const order = readPilotOrder(fixedBundleOrder(), input)
    expect(order.packs).toEqual({
      1: { status: 'preparing', trackingNumber: 'TEST-1', trackingUrl: 'https://example.com/track/1' },
      2: { status: 'dispatched', trackingNumber: 'TEST-2', trackingUrl: 'https://example.com/track/2' },
    })
  })

  it('rejects the wrong checkout reference and components outside the parent bundle', () => {
    const order = fixedBundleOrder()
    expect(() => readPilotOrder(order, { ...input, bundle: { variantId, checkout: { ...checkout, reference: 'different' } } })).toThrow('does not match')
    order.lineItems.nodes[0].lineItemGroup.id = 'other-group'
    expect(() => readPilotOrder(order, input)).toThrow('configured Shopify bundle')
  })
})
