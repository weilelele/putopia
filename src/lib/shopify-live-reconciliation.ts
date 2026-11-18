import 'server-only'
import { sendInitiationConfirmation } from './initiation-confirmation'
import type { InitiationOrderKind } from './initiation-pricing'
import { INITIAL_PILOT_QUERY } from '../../scripts/shopify/initial-pilot-order.mjs'
import { createAdminClient } from './supabase/server'
import { shopifyApiVersion, shopifyPilotRequest } from './shopify-bundle-pilot'
import { type shopifyLiveConfig } from './shopify-live-config'
import { sendPendingInitiationAnalytics } from './initiation-analytics-outbox'
import { sendPendingInitiationMetaPurchases } from './initiation-meta-purchases'
import {
  shopifyLiveCheckoutAttribute, shopifyLiveReservationId, verifyShopifyLiveOrder, withShopifyOrderVariantIdentity,
  type ShopifyLiveOrder, type ShopifyOrderIdentitySnapshot,
} from './shopify-live-order'

type Config = NonNullable<ReturnType<typeof shopifyLiveConfig>>
type EventRow = { order_gid:string; event_id:string }
type Binding = { order_id:string; email:string; variant_id:string; shopify_order_id:string|null; authorization_id:string|null; superseded_by:string|null; reference_version:number }
type Source = { id: string; user_id:string; order_kind:InitiationOrderKind; status:string; amount:number; pricing_version:string|null; membership_order_id:string|null; initial_order_id:string|null }

async function adminQuery(config: Config) {
  const root = `https://${config.shop}`
  const token = await shopifyPilotRequest<{access_token?:string}>(`${root}/admin/oauth/access_token`,{},new URLSearchParams({
    grant_type:'client_credentials',client_id:config.clientId,client_secret:config.clientSecret,
  }))
  if (!token.access_token) throw new Error('Shopify admin token is missing')
  const graphql = async <T>(query:string,variables:Record<string,unknown>) => {
    const result = await shopifyPilotRequest<{data?:T;errors?:unknown[]}>(`${root}/admin/api/${shopifyApiVersion}/graphql.json`,{
      'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token!,
    },JSON.stringify({query,variables}))
    if (result.errors?.length || !result.data) throw new Error('Shopify Admin query could not be completed')
    return result.data
  }
  return { graphql, orderIdentity: async (orderId: string) => {
    const id = orderId.match(/^gid:\/\/shopify\/Order\/(\d+)$/)?.[1]
    if (!id) throw new Error('Invalid Shopify order identity')
    return shopifyPilotRequest<ShopifyOrderIdentitySnapshot>(`${root}/admin/api/${shopifyApiVersion}/orders/${id}.json?fields=id,line_items`, {
      'X-Shopify-Access-Token':token.access_token!,
    }, undefined, 'GET')
  } }
}

async function reconcileOrder(config: Config, query: Awaited<ReturnType<typeof adminQuery>>, admin: ReturnType<typeof createAdminClient>, orderId: string) {
  // Read the current authoritative order instead of relying on webhook delivery order.
  let { order } = await query.graphql<{ order: ShopifyLiveOrder | null }>(INITIAL_PILOT_QUERY,{id:orderId,isComplete:true})
  if (!order || order.test) return
  const reference = order.customAttributes.find(field=>field.key===shopifyLiveCheckoutAttribute)?.value
  const reservationId = shopifyLiveReservationId(reference)
  if (!reservationId) return
  const [linked, source] = await Promise.all([
    admin.from('initiation_shopify_checkouts' as never).select('order_id,email,variant_id,shopify_order_id,authorization_id,superseded_by,reference_version').eq('order_id',reservationId).eq('shop',config.shop).maybeSingle(),
    admin.from('initiation_orders').select('id,user_id,order_kind,status,amount,pricing_version,membership_order_id,initial_order_id').eq('id',reservationId).maybeSingle(),
  ])
  if (linked.error || source.error) throw new Error('Shopify reservation lookup failed')
  const binding = linked.data as Binding | null
  const local = source.data as Source | null
  if (!binding || !local) return
  if (local.status==='canceled' && !binding.authorization_id && (!binding.superseded_by || order.cancelledAt)) return
  if (local.order_kind === 'membership') order = withShopifyOrderVariantIdentity(order, await query.orderIdentity(orderId))
  const evidence = verifyShopifyLiveOrder(order,{
    id:binding.order_id,shop:config.shop,userId:local.user_id,email:binding.email,kind:local.order_kind,variantId:binding.variant_id,amount:local.amount,pricingVersion:local.pricing_version,
    membershipOrderId:local.membership_order_id,initialOrderId:local.initial_order_id,referenceVersion:binding.reference_version,
  },config.clientSecret)
  if (binding.superseded_by) {
    if (evidence.state!=='authorized') throw new Error('Superseded Shopify checkout has an unexpected capture')
    const { orderCancel } = await query.graphql<{orderCancel:{job:{id:string}|null;orderCancelUserErrors:unknown[]}}>(`
      mutation VoidSupersededCheckout($orderId:ID!) {
        orderCancel(orderId:$orderId, reason:OTHER, restock:true, notifyCustomer:false,
          refundMethod:{originalPaymentMethodsRefund:false},
          staffNote:"An alternate Putopia package was already selected for payment.") {
          job{id}
          orderCancelUserErrors{code}
        }
      }
    `,{orderId:evidence.orderId})
    if (!orderCancel.job || orderCancel.orderCancelUserErrors.length) throw new Error('Superseded Shopify authorization needs review')
    // The cancellation job is asynchronous. Keep the webhook in the queue until Shopify confirms cancellation.
    throw new Error('Awaiting Shopify cancellation of the superseded checkout')
  }
  const remoteBinding = {p_reservation:binding.order_id,p_shop:config.shop,p_order_id:evidence.orderId,p_authorization_id:evidence.authorization}
  if (evidence.state === 'canceled' || evidence.state === 'reversed') {
    const reversed = await admin.rpc('reconcile_initiation_shopify_reversal' as never, {
      ...remoteBinding, p_capture_id: evidence.state === 'reversed' ? evidence.capture : null,
      p_paid_at: evidence.state === 'reversed' ? evidence.paidAt : null, p_updated_at: order.updatedAt,
      p_refunded: evidence.state === 'reversed' ? evidence.refundedAmount : 0,
      p_packs: evidence.state === 'reversed' ? evidence.refundedPacks : [],
      p_canceled: evidence.state === 'canceled' || evidence.canceled,
      p_review: evidence.state === 'reversed' && evidence.review,
      p_shipping: evidence.state === 'reversed' ? evidence.shipping : null,
    } as never)
    if (reversed.error) throw new Error('Shopify refund requires reconciliation')
    return
  }
  if (evidence.state==='authorized') {
    const approved=await admin.rpc('bind_initiation_shopify_authorization' as never,remoteBinding as never)
    if (approved.error) throw new Error('Shopify authorization was not approved for this reservation')
    if (approved.data!==true) throw new Error('Shopify authorization capture is already being reconciled')
    const { orderCapture } = await query.graphql<{orderCapture:{transaction:{status:string}|null;userErrors:unknown[]}}>(`
      mutation CapturePutopiaOrder($input:OrderCaptureInput!){orderCapture(input:$input){transaction{status} userErrors{field}}}
    `,{input:{id:evidence.orderId,parentTransactionId:evidence.authorization,amount:(evidence.amount/100).toFixed(2),currency:'USD'}})
    if (orderCapture.userErrors.length || !['PENDING','SUCCESS'].includes(orderCapture.transaction?.status??'')) {
      throw new Error('Shopify capture requires reconciliation')
    }
    // The queue keeps the order until the authoritative reread confirms the capture.
    throw new Error('Shopify capture submitted; awaiting the paid order')
  }
  if (binding.shopify_order_id!==evidence.orderId || binding.authorization_id!==evidence.authorization) {
    throw new Error('Unapproved Shopify capture requires reconciliation')
  }
  const settled=await admin.rpc('confirm_initiation_shopify_capture' as never,{
    ...remoteBinding,p_capture_id:evidence.capture,p_paid_at:evidence.paidAt,p_shipping:evidence.shipping,
  } as never)
  if (settled.error) throw new Error('Shopify membership activation requires reconciliation')
  const shipments=await admin.rpc('sync_initiation_shopify_checkout_packs' as never,{
    p_reservation:binding.order_id,p_capture:evidence.capture,p_updated_at:evidence.updatedAt,p_packs:evidence.packs,
  } as never)
  if (shipments.error) throw new Error('Shopify Pack status requires reconciliation')
  await sendInitiationConfirmation(local, binding.email)
  try { await sendPendingInitiationAnalytics(admin, null, { orderId: binding.order_id, limit: 2 }) }
  catch { console.warn('[initiation-analytics] Shopify purchase analytics deferred to the outbox') }
  try { await sendPendingInitiationMetaPurchases(admin, null, { orderId: binding.order_id, limit: 1 }) }
  catch { console.warn('[initiation-meta] Shopify purchase deferred to the outbox') }
}

export async function reconcileShopifyLiveQueue(config: Config, onlyOrder?: string) {
  const admin=createAdminClient()
  const entries=admin.from('initiation_shopify_events' as never).select('order_gid,event_id').eq('shop',config.shop)
  const result = onlyOrder ? await entries.eq('order_gid',onlyOrder) : await entries.order('received_at').limit(30)
  if (result.error) throw new Error('Shopify order queue cannot be read')
  const pending=result.data as EventRow[]
  if (!pending.length) return 0
  const query=await adminQuery(config)
  let failures=0
  for (const event of pending) {
    try {
      await reconcileOrder(config,query,admin,event.order_gid)
      const removed=await admin.from('initiation_shopify_events' as never).delete()
        .eq('shop',config.shop).eq('order_gid',event.order_gid).eq('event_id',event.event_id)
      if (removed.error) throw removed.error
    } catch {
      const deferred=await admin.from('initiation_shopify_events' as never).update({received_at:new Date().toISOString()} as never)
        .eq('shop',config.shop).eq('order_gid',event.order_gid).eq('event_id',event.event_id)
      if (deferred.error) console.error('[shopify] Could not defer order within the queue')
      failures++
    }
  }
  return failures
}
