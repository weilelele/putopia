import { describe, expect, it } from 'vitest'
import { shopifyLiveReservationReference, type ShopifyLiveOrder, type ShopifyReservation } from './shopify-live-order'
import { shopifyTransactionDiagnostics } from './shopify-transaction-diagnostics'

const reservation: ShopifyReservation = { id: '82500000-0000-4000-8000-000000000001', userId: 'user1',
  shop: 'jtuuus-k3.myshopify.com', email: 'private@example.com', kind: 'membership', variantId: 'variant1', amount: 1200, referenceVersion: 2 }
const secret = 'test-only'
const tx = { id: 'gid://shopify/OrderTransaction/1', kind: 'AUTHORIZATION', status: 'FAILURE', test: false,
  gateway: 'shopify_payments', createdAt: '2026-11-19T00:00:00Z', processedAt: null, errorCode: 'CARD_DECLINED' }
const order = { id: 'gid://shopify/Order/1', test: false, email: reservation.email,
  customAttributes: [{ key: '_putopia_live_reservation', value: shopifyLiveReservationReference(reservation, secret) }],
  transactions: [tx] } as unknown as ShopifyLiveOrder
describe('Shopify transaction diagnostic facts', () => {
  it('retains a verified failed authorization without inventing a purchase', () => {
    const rows = shopifyTransactionDiagnostics(order, reservation, secret)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ event: 'initiation_checkout_transaction_observed', capture_source: 'shopify_transaction',
      properties: { transaction_kind: 'AUTHORIZATION', transaction_status: 'FAILURE', transaction_error_code: 'CARD_DECLINED', transaction_time_source: 'created_at' } })
    expect(JSON.stringify(rows)).not.toMatch(/private|gid:|test-only|payment_status/)
  })
  it('deduplicates repeated webhooks but retains a pending-to-success transition', () => {
    const a = shopifyTransactionDiagnostics(order, reservation, secret)[0]
    expect(shopifyTransactionDiagnostics(order, reservation, secret)[0].event_key).toBe(a.event_key)
    const b = shopifyTransactionDiagnostics({ ...order, transactions: [{ ...order.transactions[0], status: 'SUCCESS' }] }, reservation, secret)[0]
    expect(b.event_key).not.toBe(a.event_key)
  })
  it('rejects test transactions, mismatched signatures and a different customer', () => {
    expect(shopifyTransactionDiagnostics(order, reservation, 'wrong-secret')).toEqual([])
    expect(shopifyTransactionDiagnostics({ ...order, email: 'other@example.com' }, reservation, secret)).toEqual([])
    expect(shopifyTransactionDiagnostics({ ...order, transactions: [{ ...order.transactions[0], test: true }] }, reservation, secret)).toEqual([])
  })
  it('durably queues only a signed successful payment method and deduplicates the provider snapshot', () => {
    const paid = { ...order, updatedAt: '2026-11-23T19:20:05Z', transactions: [{ ...order.transactions[0], status: 'SUCCESS',
      paymentDetails: { __typename: 'CardPaymentDetails', wallet: 'SHOPIFY_PAY' } }] }
    const rows = shopifyTransactionDiagnostics(paid, reservation, secret)
    const method = rows.find(row => row.event === 'initiation_checkout_payment_method_observed')
    expect(method).toMatchObject({ capture_source: 'shopify_transaction',
      properties: { payment_method: 'shop_pay', checkout_flow: 'shop_pay' } })
    expect(shopifyTransactionDiagnostics(paid, reservation, secret).find(row => row.event === method?.event)?.event_key).toBe(method?.event_key)
    expect(shopifyTransactionDiagnostics(paid, reservation, 'wrong')).toEqual([])
    expect(JSON.stringify(rows)).not.toMatch(/private|SHOPIFY_PAY|test-only|paymentDetails/)
  })
})
