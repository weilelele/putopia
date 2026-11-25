import { createHash } from 'node:crypto'
import { initiationAnalyticsProperties, sanitizeInitiationAnalytics } from './initiation-analytics'
import { sendInitiationPostHog, validShopifyAnalyticsOrder, type InitiationAnalyticsOrder, type InitiationAnalyticsUpdate,
  type InitiationAnalyticsDependencies } from './initiation-analytics-outbox'
import { diagnosticProperties, type ShopifyDiagnosticName } from './shopify-checkout-diagnostics'
import { shopifyPaymentProperties } from './shopify-payment-method'

export type ShopifyDiagnosticClaim = {
  order_id: string; event_key: string; event_uuid: string; event: ShopifyDiagnosticName; event_time: string
  capture_source: 'shopify_pixel' | 'shopify_transaction'; properties: unknown; claim_token: string; attempt_count: number
}
type Update = Omit<InitiationAnalyticsUpdate, 'claimed_at' | 'claim_token'>
export type ShopifyDiagnosticDependencies = {
  claim(orderId: string | null, limit: number): Promise<ShopifyDiagnosticClaim[]>
  loadOrder(orderId: string): Promise<InitiationAnalyticsOrder | null>
  finish(claim: ShopifyDiagnosticClaim, update: Update): Promise<boolean>
  send: InitiationAnalyticsDependencies['send']
  now(): number
  syncPaymentMethod?(claim: ShopifyDiagnosticClaim, order: InitiationAnalyticsOrder): Promise<void>
}

/** Stable deduplication per Shopify occurrence, not per event name. No client token is retained. */
export function shopifyDiagnosticKey(event: string, eventId: string) {
  return createHash('sha256').update(JSON.stringify([event, eventId])).digest('hex')
}

export async function retryShopifyCheckoutDiagnostics(deps: ShopifyDiagnosticDependencies, options: { orderId?: string; limit?: number } = {}) {
  const claims = await deps.claim(options.orderId ?? null, Math.min(20, Math.max(1, options.limit ?? 10)))
  const outcomes = await Promise.all(claims.map(async claim => {
    const finish = async (update: Update) => await deps.finish(claim, update)
      ? update.status === 'pending' ? 'retried' : update.status : 'lease_lost'
    try {
      const order = await deps.loadOrder(claim.order_id)
      if (!order || order.id !== claim.order_id || order.currency !== 'usd' || !validShopifyAnalyticsOrder(order, false)
        || !Number.isFinite(Date.parse(claim.event_time)) || !/^[0-9a-f-]{36}$/i.test(claim.event_uuid)
        || (claim.capture_source === 'shopify_transaction') !== ['initiation_checkout_transaction_observed', 'initiation_checkout_payment_method_observed'].includes(claim.event)) {
        throw new Error('Invalid checkout observation binding')
      }
      if (order.analytics_context?.disabled === true) return await finish({ status: 'skipped', last_error: null })
      if (claim.event === 'initiation_checkout_payment_method_observed') await deps.syncPaymentMethod?.(claim, order)
      const context = sanitizeInitiationAnalytics(order.analytics_context)
      await deps.send({ uuid: claim.event_uuid, event: claim.event, timestamp: claim.event_time,
        distinct_id: context.posthog_distinct_id ?? order.user_id,
        properties: {
          ...initiationAnalyticsProperties(order.order_kind, order.analytics_context, order.amount),
          ...shopifyPaymentProperties(order.shopify_checkout?.payment_method),
          ...diagnosticProperties(claim.event, claim.properties),
          analytics_version: 'shopify-checkout-diagnostics-v2', pricing_version: order.pricing_version ?? 'legacy-v1',
          source: claim.capture_source, payment_provider: 'shopify', order_id: order.id,
          checkout_path: ['email_first', 'signed_in'].includes(String(order.analytics_context?.checkout_path))
            ? order.analytics_context?.checkout_path : 'unknown',
          checkout_evidence: claim.capture_source === 'shopify_pixel' ? 'shopify_customer_event' : 'shopify_admin_transaction',
          is_internal_qa: order.analytics_context?.is_internal_qa === true,
          is_test: order.analytics_context?.environment !== 'production',
        } })
      return await finish({ status: 'sent', sent_at: new Date(deps.now()).toISOString(), last_error: null })
    } catch {
      try { return await finish({ status: 'pending', last_error: 'Checkout observation delivery unconfirmed; retry scheduled',
        next_attempt_at: new Date(deps.now() + Math.min(21600, 60 * 2 ** Math.min(12, claim.attempt_count - 1)) * 1000).toISOString() }) }
      catch { return 'failed' }
    }
  }))
  return { claimed: claims.length, sent: outcomes.filter(v => v === 'sent').length, retried: outcomes.filter(v => v === 'retried').length,
    skipped: outcomes.filter(v => v === 'skipped').length, failed: outcomes.filter(v => v === 'failed').length,
    lease_lost: outcomes.filter(v => v === 'lease_lost').length }
}

type Admin = ReturnType<typeof import('./supabase/server').createAdminClient>
export function sendPendingShopifyCheckoutDiagnostics(admin: Admin, options: { orderId?: string; limit?: number } = {}) {
  // v129 is additive and deliberately independent of generated business database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  return retryShopifyCheckoutDiagnostics({
    async claim(orderId, limit) {
      const { data, error } = await db.rpc('claim_initiation_checkout_diagnostics', { p_order: orderId, p_limit: limit })
        .abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data ?? []
    },
    async loadOrder(id) {
      const [order, binding] = await Promise.all([
        db.from('initiation_orders').select('id,user_id,status,order_kind,amount,currency,stripe_livemode,stripe_session_id,stripe_payment_intent,paid_at,pricing_version,membership_order_id,analytics_context')
          .eq('id', id).maybeSingle().abortSignal(AbortSignal.timeout(5000)),
        db.from('initiation_shopify_checkouts').select('order_id,shop,checkout_url,shopify_order_id,authorization_id,capture_id,payment_method')
          .eq('order_id', id).maybeSingle().abortSignal(AbortSignal.timeout(5000)),
      ])
      if (order.error || binding.error) throw new Error('Checkout observation lookup failed')
      return order.data ? { ...order.data, shopify_checkout: binding.data } : null
    },
    async finish(claim, update) {
      const { data, error } = await db.from('initiation_checkout_diagnostics').update({ ...update, claimed_at: null, claim_token: null })
        .eq('order_id', claim.order_id).eq('event_key', claim.event_key).eq('status', 'processing')
        .eq('claim_token', claim.claim_token).select('order_id').abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data?.length === 1
    },
    async syncPaymentMethod(claim, order) {
      const properties = diagnosticProperties(claim.event, claim.properties)
      if (!order.shopify_checkout?.shopify_order_id || properties.payment_method === 'unknown') throw new Error('Payment method binding not ready')
      const { error } = await db.rpc('record_initiation_shopify_payment_method', {
        p_order: order.id, p_shop: order.shopify_checkout.shop, p_shopify_order: order.shopify_checkout.shopify_order_id,
        p_method: properties.payment_method, p_updated_at: claim.event_time,
      }).abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
    },
    send: sendInitiationPostHog, now: Date.now,
  }, options)
}
