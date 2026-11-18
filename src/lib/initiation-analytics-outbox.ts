import { isInitiationOrderAmount } from './initiation-pricing'
import type Stripe from 'stripe'
import { initiationAnalyticsProperties, sanitizeInitiationAnalytics } from './initiation-analytics'
import { shopifyLiveCheckoutUrl, shopifyLiveShop } from './shopify-checkout-url'
import { INITIATION_PRODUCT, type InitiationOrderKind } from './initiation-types'
import type { ShopifyCheckoutStage } from './shopify-customer-events'

export type InitiationAnalyticsClaim = {
  order_id: string; event: 'initiation_checkout_started' | 'initiation_purchase_completed' | ShopifyCheckoutStage
  event_uuid: string; event_time: string; claim_token: string; attempt_count: number; reused: boolean
  capture_source?: 'server' | 'shopify_pixel'
}
export type InitiationAnalyticsOrder = {
  id: string; user_id: string; status: string; order_kind: InitiationOrderKind; amount: number; currency: string
  stripe_livemode: boolean; stripe_session_id: string | null; stripe_payment_intent: string | null; paid_at: string | null
  pricing_version?: string | null
  membership_order_id?: string | null
  analytics_context: Record<string, unknown> | null
  meta_attribution?: { disabled?: boolean; fbp?: string; fbc?: string } | null
  shopify_checkout?: {
    order_id: string; shop: string; checkout_url: string | null
    shopify_order_id: string | null; authorization_id: string | null; capture_id: string | null
  } | null
}
export type InitiationAnalyticsUpdate = {
  status: 'sent' | 'pending' | 'skipped'; claimed_at: null; claim_token: null
  last_error: string | null; sent_at?: string; next_attempt_at?: string
}
export type InitiationAnalyticsDependencies = {
  claim(orderId: string | null, limit: number): Promise<InitiationAnalyticsClaim[]>
  loadOrder(orderId: string): Promise<InitiationAnalyticsOrder | null>
  finish(claim: InitiationAnalyticsClaim, update: InitiationAnalyticsUpdate): Promise<boolean>
  retrieveSession(id: string): Promise<Stripe.Checkout.Session>
  retrieveIntent(id: string): Promise<Stripe.PaymentIntent>
  send(input: { uuid: string; event: string; distinct_id: string; timestamp: string; properties: Record<string, unknown> }): Promise<void>
  now(): number
}

export function validInitiationAnalyticsSession(order: InitiationAnalyticsOrder, session: Stripe.Checkout.Session) {
  return session.id === order.stripe_session_id && session.livemode === order.stripe_livemode && session.mode === 'payment'
    && session.amount_total === order.amount && session.currency === order.currency
    && session.metadata?.product_type === INITIATION_PRODUCT && session.metadata?.order_id === order.id
    && session.metadata?.user_id === order.user_id && session.metadata?.order_kind === order.order_kind
}

/** These bindings are written only after the signed Shopify order is verified and its capture confirmed. */
export function validShopifyAnalyticsOrder(order: InitiationAnalyticsOrder, purchase: boolean) {
  const checkout = order.shopify_checkout
  if (!checkout || checkout.order_id !== order.id || checkout.shop !== shopifyLiveShop
    || !checkout.checkout_url || !shopifyLiveCheckoutUrl(checkout.checkout_url)
    || order.stripe_session_id || order.stripe_payment_intent || !order.stripe_livemode
    || !isInitiationOrderAmount(order)) return false
  if (!purchase) return true
  return !!(checkout.shopify_order_id && /^gid:\/\/shopify\/Order\/\d+$/.test(checkout.shopify_order_id)
    && checkout.authorization_id && /^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(checkout.authorization_id)
    && checkout.capture_id && /^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(checkout.capture_id)
    && checkout.capture_id !== checkout.authorization_id && order.status === 'paid' && order.paid_at)
}

/** Delivery is observation only: it cannot capture, cancel or create a payment. */
export async function retryInitiationAnalytics(deps: InitiationAnalyticsDependencies, options: { orderId?: string; limit?: number } = {}) {
  const claims = await deps.claim(options.orderId ?? null, Math.max(1, Math.min(5, options.limit ?? 5)))
  const outcomes = await Promise.all(claims.map(async claim => {
    const finish = async (update: Omit<InitiationAnalyticsUpdate, 'claimed_at' | 'claim_token'>) => {
      const saved = await deps.finish(claim, { ...update, claimed_at: null, claim_token: null })
      return saved ? update.status === 'pending' ? 'retried' : update.status : 'lease_lost'
    }
    try {
      const order = await deps.loadOrder(claim.order_id)
      if (!order || order.id !== claim.order_id || !isInitiationOrderAmount(order) || order.currency !== 'usd'
        || !Number.isFinite(Date.parse(claim.event_time)) || !/^[0-9a-f-]{36}$/i.test(claim.event_uuid)) throw new Error('Invalid analytics binding')
      if (order.analytics_context?.disabled === true) return await finish({ status: 'skipped', last_error: null })
      const purchase = claim.event === 'initiation_purchase_completed'
      if (purchase && order.status !== 'paid') return await finish({ status: 'skipped', last_error: 'Order is no longer paid' })
      const provider = order.shopify_checkout ? 'shopify' : 'stripe'
      const pixel = claim.capture_source === 'shopify_pixel'
      if (pixel && (provider !== 'shopify' || purchase || claim.event === 'initiation_checkout_started')) throw new Error('Invalid pixel event')
      if (provider === 'shopify') {
        if (!validShopifyAnalyticsOrder(order, purchase)) throw new Error('Invalid Shopify analytics binding')
        if (purchase && Date.parse(claim.event_time) !== Date.parse(order.paid_at ?? '')) throw new Error('Invalid paid evidence')
      } else {
        if (!order.stripe_session_id) throw new Error('Invalid analytics binding')
        const session = await deps.retrieveSession(order.stripe_session_id)
        if (!validInitiationAnalyticsSession(order, session)) throw new Error('Invalid analytics binding')
        if (purchase) {
          const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
          if (!intentId || intentId !== order.stripe_payment_intent || session.status !== 'complete' || session.payment_status !== 'paid'
            || Date.parse(claim.event_time) !== Date.parse(order.paid_at ?? '')) throw new Error('Invalid paid evidence')
          const intent = await deps.retrieveIntent(intentId)
          if (intent.status !== 'succeeded' || intent.amount_received !== order.amount || intent.amount !== order.amount
            || intent.currency !== 'usd' || intent.livemode !== order.stripe_livemode || intent.metadata.order_id !== order.id
            || intent.metadata.order_kind !== order.order_kind || intent.metadata.product_type !== INITIATION_PRODUCT) throw new Error('Payment is not captured')
        }
      }
      if (purchase) {
        const current = await deps.loadOrder(order.id)
        if (!current || current.status !== 'paid') return await finish({ status: 'skipped', last_error: 'Order is no longer paid' })
        if (current.analytics_context?.disabled === true) return await finish({ status: 'skipped', last_error: null })
        if (provider === 'shopify' && (!validShopifyAnalyticsOrder(current, true)
          || current.shopify_checkout?.capture_id !== order.shopify_checkout?.capture_id)) throw new Error('Shopify capture changed')
      }
      const context = sanitizeInitiationAnalytics(order.analytics_context)
      await deps.send({ uuid: claim.event_uuid, event: claim.event, distinct_id: context.posthog_distinct_id ?? order.user_id, timestamp: claim.event_time,
        properties: { ...initiationAnalyticsProperties(order.order_kind, order.analytics_context, order.amount), pricing_version: order.pricing_version ?? 'legacy-v1', source: pixel ? 'shopify_pixel' : 'server', order_id: order.id,
          is_internal_qa: order.analytics_context?.is_internal_qa === true,
          payment_provider: provider,
          checkout_path: ['email_first', 'signed_in'].includes(String(order.analytics_context?.checkout_path))
            ? order.analytics_context?.checkout_path : 'unknown',
          ...(!purchase ? { checkout_evidence: pixel ? 'shopify_customer_event' : 'server_checkout_created' } : {}),
          ...(provider === 'shopify' ? { shopify_order_id: order.shopify_checkout?.shopify_order_id,
            ...(purchase ? { payment_evidence: 'verified_shopify_capture' } : {}) } : {}),
          is_test: !order.stripe_livemode || order.analytics_context?.environment !== 'production',
          ...(purchase ? {
            payment_status: 'paid', meta_event_id: `initiation_purchase_${order.id}`,
            // Matching inputs only; Meta receipt lives in initiation_meta_purchases.
            // Neither these flags nor an API receipt prove Ads Manager attribution.
            meta_has_browser_id: !!order.meta_attribution?.fbp,
            meta_has_click_id: !!order.meta_attribution?.fbc,
            meta_tracking_disabled: order.meta_attribution?.disabled === true,
          } : { reused: claim.reused }) } })
      return await finish({ status: 'sent', sent_at: new Date(deps.now()).toISOString(), last_error: null })
    } catch {
      try { return await finish({ status: 'pending', last_error: 'Analytics delivery unconfirmed; retry scheduled',
        next_attempt_at: new Date(deps.now() + Math.min(21600, 60 * 2 ** Math.min(12, claim.attempt_count - 1)) * 1000).toISOString() }) }
      catch { return 'failed' }
    }
  }))
  return { claimed: claims.length, sent: outcomes.filter(v => v === 'sent').length, retried: outcomes.filter(v => v === 'retried').length,
    skipped: outcomes.filter(v => v === 'skipped').length, failed: outcomes.filter(v => v === 'failed').length, lease_lost: outcomes.filter(v => v === 'lease_lost').length }
}

/** Explicit HTTP acknowledgement; the SDK's immediate method swallows errors. */
export async function sendInitiationPostHog(input: Parameters<InitiationAnalyticsDependencies['send']>[0], env: Record<string, string | undefined> = process.env, fetcher = fetch) {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) throw new Error('Analytics is not configured')
  const host = new URL(env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
  if (host.protocol !== 'https:' || host.username || host.password) throw new Error('Invalid analytics host')
  const response = await fetcher(new URL('/i/v0/e/', host), { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, ...input }), signal: AbortSignal.timeout(5000), redirect: 'error' })
  if (!response.ok) throw new Error('Analytics did not acknowledge delivery')
  const receipt = await response.json().catch(() => null)
  if (receipt?.status !== 1 && receipt?.status !== 'Ok') throw new Error('Analytics did not acknowledge delivery')
}

type Admin = ReturnType<typeof import('./supabase/server').createAdminClient>
export function sendPendingInitiationAnalytics(admin: Admin, stripe: Stripe | null, options: { orderId?: string; limit?: number } = {}) {
  // The new additive schema is deployed independently of generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  return retryInitiationAnalytics({
    async claim(orderId, limit) {
      const { data, error } = await db.rpc('claim_initiation_analytics', { p_order: orderId, p_limit: limit }).abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data ?? []
    },
    async loadOrder(id) {
      const { data, error } = await db.from('initiation_orders').select('id,user_id,status,order_kind,pricing_version,membership_order_id,amount,currency,stripe_livemode,stripe_session_id,stripe_payment_intent,paid_at,analytics_context,meta_attribution')
        .eq('id', id).maybeSingle().abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      if (!data || data.stripe_session_id) return data
      const binding = await db.from('initiation_shopify_checkouts')
        .select('order_id,shop,checkout_url,shopify_order_id,authorization_id,capture_id')
        .eq('order_id', id).maybeSingle().abortSignal(AbortSignal.timeout(5000))
      if (binding.error) throw binding.error
      return { ...data, shopify_checkout: binding.data }
    },
    async finish(claim, update) {
      const { data, error } = await db.from('initiation_analytics_outbox').update(update).eq('order_id', claim.order_id).eq('event', claim.event)
        .eq('status', 'processing').eq('claim_token', claim.claim_token).select('order_id').abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data?.length === 1
    },
    retrieveSession: async id => {
      if (!stripe) throw new Error('Stripe is not configured')
      return stripe.checkout.sessions.retrieve(id, {}, { timeout: 5000, maxNetworkRetries: 0 })
    },
    retrieveIntent: async id => {
      if (!stripe) throw new Error('Stripe is not configured')
      return stripe.paymentIntents.retrieve(id, {}, { timeout: 5000, maxNetworkRetries: 0 })
    },
    send: sendInitiationPostHog, now: Date.now,
  }, options)
}

export async function queueInitiationCheckoutAnalytics(admin: Admin, orderId: string, reused: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).rpc('queue_initiation_checkout_analytics', { p_order: orderId, p_reused: reused }).abortSignal(AbortSignal.timeout(5000))
  if (error) throw error
}
