import 'server-only'
import { createAdminClient } from './supabase/server'
import { shopifyLiveAdminQuery } from './shopify-live-reconciliation'
import type { shopifyLiveConfig } from './shopify-live-config'
import type { ShopifyLiveOrder, ShopifyReservation } from './shopify-live-order'
import { SHOPIFY_PAYMENT_METHOD_QUERY, shopifyOrderPaymentMethod } from './shopify-payment-method'
import { queueShopifyTransactionDiagnostics, shopifyTransactionDiagnostics } from './shopify-transaction-diagnostics'

type Job = { order_id: string; queued_at: string; attempt_count: number }
type Binding = { shop: string; email: string; variant_id: string; shopify_order_id: string; reference_version: number }
type Source = { user_id: string; order_kind: ShopifyReservation['kind']; amount: number; pricing_version: string | null;
  membership_order_id: string | null; initial_order_id: string | null; analytics_context: Record<string, unknown> }

/** Independent observation queue. No capture, cancel, entitlement, shipping or email operation. */
export async function retryShopifyPaymentMetadata(config: NonNullable<ReturnType<typeof shopifyLiveConfig>>) {
  const admin = createAdminClient()
  const pending = await admin.from('initiation_shopify_payment_metadata_queue' as never)
    .select('order_id,queued_at,attempt_count').lte('next_attempt_at', new Date().toISOString()).order('next_attempt_at').limit(3)
    .abortSignal(AbortSignal.timeout(5000))
  if (pending.error) throw new Error('Payment metadata queue unavailable')
  const jobs = pending.data as Job[]
  if (!jobs.length) return { processed: 0, retried: 0 }
  const provider = await shopifyLiveAdminQuery(config)
  const outcomes = await Promise.all(jobs.map(async job => {
    try {
      const [linked, source] = await Promise.all([
        admin.from('initiation_shopify_checkouts' as never).select('shop,email,variant_id,shopify_order_id,reference_version').eq('order_id', job.order_id).maybeSingle(),
        admin.from('initiation_orders').select('user_id,order_kind,amount,pricing_version,membership_order_id,initial_order_id,analytics_context').eq('id', job.order_id).maybeSingle(),
      ])
      if (linked.error || source.error) throw new Error('Payment metadata binding unavailable')
      const binding = linked.data as Binding | null
      if (!binding || !source.data || binding.shop !== config.shop || !binding.shopify_order_id) throw new Error('Payment metadata binding unavailable')
      const local = source.data as Source
      const reservation: ShopifyReservation = { id: job.order_id, userId: local.user_id, shop: binding.shop,
        email: binding.email, variantId: binding.variant_id, kind: local.order_kind, amount: local.amount,
        pricingVersion: local.pricing_version, membershipOrderId: local.membership_order_id,
        initialOrderId: local.initial_order_id, referenceVersion: binding.reference_version }
      const { order } = await provider.graphql<{ order: ShopifyLiveOrder | null }>(SHOPIFY_PAYMENT_METHOD_QUERY, { id: binding.shopify_order_id })
      if (!order || order.id !== binding.shopify_order_id) throw new Error('Payment metadata order unavailable')
      // This shared projection verifies test status, signature, email and successful provider transaction.
      const observations = shopifyTransactionDiagnostics(order, reservation, config.clientSecret)
      const method = shopifyOrderPaymentMethod(order)
      if (method === 'unknown' || !observations.some(row => row.event === 'initiation_checkout_payment_method_observed')) {
        throw new Error('Payment metadata not yet observable')
      }
      if (local.analytics_context.disabled !== true) await queueShopifyTransactionDiagnostics(admin, order, reservation, config.clientSecret)
      const saved = await admin.rpc('record_initiation_shopify_payment_method' as never, {
        p_order: job.order_id, p_shop: config.shop, p_shopify_order: order.id, p_method: method, p_updated_at: order.updatedAt,
      } as never).abortSignal(AbortSignal.timeout(5000))
      if (saved.error) throw new Error('Payment metadata update unavailable')
      // A newer authorization/capture must keep its newly queued work, even if this worker finishes late.
      const finished = await admin.from('initiation_shopify_payment_metadata_queue' as never).delete()
        .eq('order_id', job.order_id).eq('queued_at', job.queued_at).abortSignal(AbortSignal.timeout(5000))
      if (finished.error) throw new Error('Payment metadata completion unavailable')
      return true
    } catch {
      const retry = await admin.from('initiation_shopify_payment_metadata_queue' as never).update({
        attempt_count: job.attempt_count + 1,
        next_attempt_at: new Date(Date.now() + Math.min(21600, 60 * 2 ** Math.min(job.attempt_count, 12)) * 1000).toISOString(),
      } as never).eq('order_id', job.order_id).eq('queued_at', job.queued_at).abortSignal(AbortSignal.timeout(5000))
      if (retry.error) console.warn('[shopify-observation] Payment metadata retry scheduling unavailable')
      return false
    }
  }))
  return { processed: outcomes.filter(Boolean).length, retried: outcomes.filter(value => !value).length }
}
