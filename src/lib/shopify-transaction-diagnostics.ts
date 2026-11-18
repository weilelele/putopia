import { shopifyLiveReservationReference, type ShopifyReservation, type ShopifyLiveOrder } from './shopify-live-order'
import { diagnosticProperties } from './shopify-checkout-diagnostics'
import { shopifyDiagnosticKey } from './shopify-checkout-diagnostics-outbox'

/** Admin API evidence only. These observations never authorize payment or activate membership. */
export function shopifyTransactionDiagnostics(order: ShopifyLiveOrder, reservation: ShopifyReservation, secret: string) {
  if (order.test || !/^gid:\/\/shopify\/Order\/\d+$/.test(order.id)
    || order.customAttributes.filter(a => a.key === '_putopia_live_reservation').length !== 1
    || order.customAttributes.find(a => a.key === '_putopia_live_reservation')?.value !== shopifyLiveReservationReference(reservation, secret)
    || order.email?.trim().toLowerCase() !== reservation.email.trim().toLowerCase()) return []
  return order.transactions.flatMap(tx => {
    if (tx.test || tx.gateway !== 'shopify_payments' || !/^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(tx.id)
      || !['AUTHORIZATION', 'CAPTURE', 'SALE', 'VOID', 'REFUND'].includes(tx.kind)) return []
    const time = tx.processedAt ?? tx.createdAt
    if (!time || !Number.isFinite(Date.parse(time))) return []
    const properties = diagnosticProperties('initiation_checkout_transaction_observed', {
      transaction_kind: tx.kind, transaction_status: tx.status,
      transaction_error_code: tx.errorCode ?? 'NONE', transaction_time_source: tx.processedAt ? 'processed_at' : 'created_at',
    })
    return [{ order_id: reservation.id, event: 'initiation_checkout_transaction_observed',
      event_key: shopifyDiagnosticKey('initiation_checkout_transaction_observed', JSON.stringify([tx.id, properties])),
      event_time: new Date(time).toISOString(), capture_source: 'shopify_transaction', properties }]
  })
}

export async function queueShopifyTransactionDiagnostics(admin: ReturnType<typeof import('./supabase/server').createAdminClient>,
  order: ShopifyLiveOrder, reservation: ShopifyReservation, secret: string) {
  const observations = shopifyTransactionDiagnostics(order, reservation, secret)
  if (!observations.length) return
  const { error } = await admin.from('initiation_checkout_diagnostics' as never)
    .upsert(observations as never, { onConflict: 'order_id,event_key', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(5000))
  if (error) throw new Error('Shopify transaction observation queue unavailable')
  // The independent cron drains this outbox; no analytics network call delays payment reconciliation.
}
