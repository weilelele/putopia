import { INITIATION_PRICES, isInitiationOrderAmount } from './initiation-pricing'
import type Stripe from 'stripe'
import { isIOSNativeApp } from './app-platform'
import { INITIATION_PRODUCT, type InitiationOrderKind } from './initiation-types'
import { sendMetaPurchase, type MetaPurchaseInput } from './meta-capi'
import type { InitiationMetaAttribution } from './initiation-meta-attribution'
import { initiationBuyerId } from './guest-checkout'

export type InitiationMetaOrder = {
  id: string
  user_id: string
  purchased_by?: string | null
  status: string
  pricing_version?: string | null
  order_kind: InitiationOrderKind
  amount: number
  currency: string
  stripe_livemode: boolean
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  paid_at: string | null
  meta_attribution: InitiationMetaAttribution | null
}

export type InitiationMetaClaim = {
  order_id: string
  event_id: string
  event_time: string
  attempt_count: number
  claim_token: string
}

type ClaimUpdate = {
  status: 'sent' | 'pending' | 'skipped'
  claimed_at: null
  claim_token: null
  last_error: string | null
  next_attempt_at?: string
  sent_at?: string
  meta_trace_id?: string | null
}

export type InitiationMetaStore = {
  claim(orderId: string | null, limit: number): Promise<InitiationMetaClaim[]>
  loadOrder(orderId: string): Promise<InitiationMetaOrder | null>
  /** Must update only the matching processing claim_token. */
  finish(claim: InitiationMetaClaim, update: ClaimUpdate): Promise<boolean>
}

export type InitiationMetaDependencies = {
  store: InitiationMetaStore
  retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session>
  sendPurchase(input: MetaPurchaseInput, options: { stripeLiveMode: boolean }): Promise<{ events_received?: number; fbtrace_id?: string }>
  now(): number
}

class PurchaseValidationError extends Error {}

/** Paid database state and the freshly retrieved Stripe session must agree. */
export function buildInitiationMetaPurchase(
  order: InitiationMetaOrder, claim: InitiationMetaClaim, session: Stripe.Checkout.Session,
): MetaPurchaseInput {
  if (order.status !== 'paid') throw new PurchaseValidationError('Order is not paid')
  const paidAt = Date.parse(order.paid_at ?? '')
  const eventAt = Date.parse(claim.event_time)
  if (claim.order_id !== order.id || claim.event_id !== `initiation_purchase_${order.id}`
    || !Number.isFinite(eventAt) || eventAt <= 0 || eventAt !== paidAt) {
    throw new PurchaseValidationError('Purchase identity is invalid')
  }
  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!isInitiationOrderAmount(order) || order.currency !== 'usd'
    || !order.stripe_session_id || order.stripe_session_id !== session.id
    || !order.stripe_payment_intent || order.stripe_payment_intent !== intentId
    || session.livemode !== order.stripe_livemode || session.mode !== 'payment'
    || session.status !== 'complete' || session.payment_status !== 'paid'
    || session.amount_total !== order.amount || session.currency !== 'usd'
    || session.metadata?.product_type !== INITIATION_PRODUCT || session.metadata?.order_id !== order.id
    || session.metadata?.user_id !== initiationBuyerId(order) || session.metadata?.order_kind !== order.order_kind) {
    throw new PurchaseValidationError('Stripe purchase binding is invalid')
  }
  const attribution = order.meta_attribution ?? {}
  const details = session.customer_details
  const shipping = (session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null }
  }).collected_information?.shipping_details
    ?? (session as Stripe.Checkout.Session & { shipping_details?: { name?: string | null; address?: Stripe.Address | null } }).shipping_details
  const address = shipping?.address ?? details?.address
  const name = (shipping?.name ?? details?.name)?.trim().split(/\s+/) ?? []
  return {
    eventId: claim.event_id,
    eventTime: Math.floor(eventAt / 1000),
    value: order.amount / 100,
    currency: 'USD',
    contentId: INITIATION_PRODUCT,
    contentName: INITIATION_PRICES[order.order_kind].name,
    orderId: order.id,
    orderKind: order.order_kind,
    pricingVersion: order.pricing_version ?? 'legacy-v1',
    eventSourceUrl: attribution.event_source_url ?? 'https://www.multiverseco.org/voyager-initiation',
    email: details?.email ?? session.customer_email,
    phone: details?.phone,
    firstName: name[0],
    lastName: name.length > 1 ? name.slice(1).join(' ') : undefined,
    city: address?.city,
    state: address?.state,
    postalCode: address?.postal_code,
    country: address?.country,
    externalId: order.user_id,
    clientIpAddress: attribution.client_ip_address,
    clientUserAgent: attribution.client_user_agent,
    fbp: attribution.fbp,
    fbc: attribution.fbc,
  }
}

export function initiationMetaRetryAt(attempt: number, now: number): string {
  const seconds = Math.min(6 * 60 * 60, 60 * 2 ** Math.min(12, Math.max(0, attempt - 1)))
  return new Date(now + seconds * 1000).toISOString()
}

/** Never persist raw Stripe/Meta responses, request URLs, credentials or customer data. */
export function safeInitiationMetaError(error: unknown): string {
  if (error instanceof PurchaseValidationError) return error.message
  if (error instanceof Error) {
    const http = /^Meta CAPI Purchase request failed with HTTP (\d{3})$/.exec(error.message)
    if (http) return `Meta CAPI HTTP ${http[1]}`
    if (error.message === 'Meta CAPI is not configured: META_CAPI_ACCESS_TOKEN is missing') return 'Meta CAPI configuration is missing'
    if (error.message === 'Meta CAPI test events require a test event code') return 'Meta CAPI test event code is missing'
    if (error.message === 'Meta CAPI dataset ID is invalid' || error.message === 'Meta CAPI API version is invalid') return 'Meta CAPI configuration is invalid'
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'Purchase delivery timed out'
  }
  return 'Purchase delivery was not confirmed; retry scheduled'
}

type DeliveryOutcome = 'sent' | 'retried' | 'skipped' | 'lease_lost' | 'failed'

export async function deliverInitiationMetaPurchase(
  claim: InitiationMetaClaim, deps: InitiationMetaDependencies,
): Promise<DeliveryOutcome> {
  const finish = async (update: Omit<ClaimUpdate, 'claimed_at' | 'claim_token'>): Promise<DeliveryOutcome> => {
    const updated = await deps.store.finish(claim, { ...update, claimed_at: null, claim_token: null })
    return updated ? update.status === 'pending' ? 'retried' : update.status : 'lease_lost'
  }
  try {
    const order = await deps.store.loadOrder(claim.order_id)
    if (!order) throw new PurchaseValidationError('Purchase order is unavailable')
    if (order.status !== 'paid') return await finish({ status: 'skipped', last_error: 'Order is no longer paid' })
    if (order.meta_attribution?.disabled === true || isIOSNativeApp(order.meta_attribution?.client_user_agent ?? '')) {
      return await finish({ status: 'skipped', last_error: null })
    }
    if (!order.stripe_session_id) throw new PurchaseValidationError('Stripe purchase binding is invalid')
    const session = await deps.retrieveSession(order.stripe_session_id)
    buildInitiationMetaPurchase(order, claim, session)
    // A refund/review webhook may have arrived while Stripe was being queried.
    const current = await deps.store.loadOrder(claim.order_id)
    if (!current || current.status !== 'paid') return await finish({ status: 'skipped', last_error: 'Order is no longer paid' })
    if (current.meta_attribution?.disabled === true || isIOSNativeApp(current.meta_attribution?.client_user_agent ?? '')) {
      return await finish({ status: 'skipped', last_error: null })
    }
    const input = buildInitiationMetaPurchase(current, claim, session)
    const result = await deps.sendPurchase(input, { stripeLiveMode: current.stripe_livemode })
    if (result.events_received !== 1) throw new Error('Purchase receipt was not confirmed')
    return await finish({
      status: 'sent', sent_at: new Date(deps.now()).toISOString(), last_error: null,
      meta_trace_id: typeof result.fbtrace_id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(result.fbtrace_id) ? result.fbtrace_id : null,
    })
  } catch (error) {
    try {
      return await finish({ status: 'pending', last_error: safeInitiationMetaError(error), next_attempt_at: initiationMetaRetryAt(claim.attempt_count, deps.now()) })
    } catch {
      // A database outage leaves the processing lease recoverable after five minutes.
      return 'failed'
    }
  }
}

export async function retryInitiationMetaPurchases(
  deps: InitiationMetaDependencies, options: { orderId?: string; limit?: number } = {},
) {
  const limit = Math.max(1, Math.min(5, Math.floor(options.limit ?? 5)))
  const claims = await deps.store.claim(options.orderId ?? null, limit)
  const outcomes = await Promise.all(claims.map(claim => deliverInitiationMetaPurchase(claim, deps)))
  return {
    claimed: claims.length,
    sent: outcomes.filter(outcome => outcome === 'sent').length,
    retried: outcomes.filter(outcome => outcome === 'retried').length,
    skipped: outcomes.filter(outcome => outcome === 'skipped').length,
    failed: outcomes.filter(outcome => outcome === 'failed').length,
    lease_lost: outcomes.filter(outcome => outcome === 'lease_lost').length,
  }
}

type AdminClient = ReturnType<typeof import('./supabase/server').createAdminClient>

/** Service-role adapter; no environment, database or network access until called. */
export function createInitiationMetaStore(admin: AdminClient): InitiationMetaStore {
  // Schema v97 is deployed independently from the generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  return {
    async claim(orderId, limit) {
      const { data, error } = await db.rpc('claim_initiation_meta_purchases', { p_order: orderId, p_limit: limit }).abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data ?? []
    },
    async loadOrder(orderId) {
      const { data, error } = await db.from('initiation_orders')
        .select('id,user_id,purchased_by,status,order_kind,pricing_version,amount,currency,stripe_livemode,stripe_session_id,stripe_payment_intent,paid_at,meta_attribution')
        .eq('id', orderId).maybeSingle().abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data
    },
    async finish(claim, update) {
      const { data, error } = await db.from('initiation_meta_purchases').update(update)
        .eq('order_id', claim.order_id).eq('status', 'processing').eq('claim_token', claim.claim_token)
        .select('order_id').abortSignal(AbortSignal.timeout(5000))
      if (error) throw error
      return data?.length === 1
    },
  }
}

/** Small parallel batches, finite Stripe/Meta/DB timeouts, persistent failures. */
export function sendPendingInitiationMetaPurchases(
  admin: AdminClient, stripe: Stripe, options: { orderId?: string; limit?: number } = {},
) {
  return retryInitiationMetaPurchases({
    store: createInitiationMetaStore(admin),
    retrieveSession: sessionId => stripe.checkout.sessions.retrieve(sessionId, {}, { timeout: 5000, maxNetworkRetries: 0 }),
    sendPurchase: sendMetaPurchase,
    now: Date.now,
  }, options)
}
