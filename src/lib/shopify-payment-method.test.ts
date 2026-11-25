import { describe, expect, it } from 'vitest'
import type { ShopifyLiveOrder } from './shopify-live-order'
import { shopifyOrderPaymentMethod, shopifyPaymentProperties } from './shopify-payment-method'

type Transaction = ShopifyLiveOrder['transactions'][number]
const authorization = { id: 'gid://shopify/OrderTransaction/1', kind: 'AUTHORIZATION', status: 'SUCCESS', test: false,
  gateway: 'shopify_payments', processedAt: '2026-11-23T19:19:58Z', parentTransaction: null,
  paymentDetails: { __typename: 'CardPaymentDetails', wallet: 'SHOPIFY_PAY' } } as Transaction
const capture = { ...authorization, id: 'gid://shopify/OrderTransaction/2', kind: 'CAPTURE',
  processedAt: '2026-11-23T19:20:05Z', paymentDetails: null, parentTransaction: { id: authorization.id } }
const order = (transactions: Transaction[], test = false) => ({ transactions, test }) as ShopifyLiveOrder

describe('authoritative Shopify payment classification', () => {
  it('recognizes Shop Pay from the captured payment or its actual parent authorization', () => {
    expect(shopifyOrderPaymentMethod(order([authorization, capture]))).toBe('shop_pay')
    expect(shopifyPaymentProperties('shop_pay')).toMatchObject({ checkout_flow: 'shop_pay', payment_method_evidence: 'shopify_admin_transaction' })
  })
  it('does not relabel a card settlement after a failed Shop Pay attempt', () => {
    const card = { ...authorization, id: 'gid://shopify/OrderTransaction/3', paymentDetails: { __typename: 'CardPaymentDetails', wallet: null } }
    expect(shopifyOrderPaymentMethod(order([{ ...authorization, status: 'FAILURE' }, card,
      { ...capture, parentTransaction: { id: card.id } }]))).toBe('card')
  })
  it('leaves absent details, pending attempts, test transactions and missing parent unknown', () => {
    for (const txs of [[{ ...authorization, paymentDetails: null }], [{ ...authorization, status: 'PENDING' }],
      [{ ...authorization, test: true }], [{ ...authorization, paymentDetails: { __typename: 'CardPaymentDetails' } }], [capture]]) {
      expect(shopifyOrderPaymentMethod(order(txs))).toBe('unknown')
    }
    expect(shopifyOrderPaymentMethod(order([authorization], true))).toBe('unknown')
    expect(shopifyPaymentProperties(undefined)).toMatchObject({ payment_method: 'unknown', checkout_flow: 'unknown' })
  })
  it('separates card, other wallets and installments without forwarding details', () => {
    for (const [details, method, flow] of [
      [{ __typename: 'CardPaymentDetails', wallet: null }, 'card', 'standard'],
      [{ __typename: 'CardPaymentDetails', wallet: 'APPLE_PAY' }, 'apple_pay', 'other_express'],
      [{ __typename: 'CardPaymentDetails', wallet: 'FUTURE_WALLET' }, 'other_wallet', 'other_express'],
      [{ __typename: 'ShopPayInstallmentsPaymentDetails' }, 'shop_pay_installments', 'shop_pay'],
    ] as const) {
      expect(shopifyOrderPaymentMethod(order([{ ...authorization, paymentDetails: details }]))).toBe(method)
      expect(shopifyPaymentProperties(method).checkout_flow).toBe(flow)
    }
    expect(shopifyPaymentProperties('private-card-number')).toEqual(shopifyPaymentProperties('unknown'))
  })
})
