import type { InitiationOrderKind } from '@/lib/initiation-pricing'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { shopifyLiveConfig } from '@/lib/shopify-live-config'
import { shopifyLiveReservationReference } from '@/lib/shopify-live-order'
import { parseShopifyCustomerEvent } from '@/lib/shopify-customer-events'
import { afterCheckout } from '@/lib/checkout-after'
import { sendPendingInitiationAnalytics } from '@/lib/initiation-analytics-outbox'
import { parseShopifyCheckoutDiagnostic } from '@/lib/shopify-checkout-diagnostics'
import { sendPendingShopifyCheckoutDiagnostics, shopifyDiagnosticKey } from '@/lib/shopify-checkout-diagnostics-outbox'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' }
export const dynamic = 'force-dynamic'

export function OPTIONS() { return new Response(null, { status: 204, headers: cors }) }

/** A buyer-held, signed checkout reference authorizes observation of that checkout only. */
export async function POST(request: Request) {
  const respond = (status: number) => new Response(null, { status, headers: cors })
  const config = shopifyLiveConfig()
  if (!config) return respond(404)
  try {
    if (Number(request.headers.get('content-length')) > 2048) return respond(413)
    const body = await request.text()
    if (body.length > 2048) return respond(413)
    let value: unknown
    try { value = JSON.parse(body) } catch { return respond(400) }
    const stage = parseShopifyCustomerEvent(value, Date.now())
    const diagnostic = parseShopifyCheckoutDiagnostic(value, Date.now())
    const event = stage ?? diagnostic
    if (!event) return respond(400)
    const admin = createAdminClient()
    const [bound, order] = await Promise.all([
      admin.from('initiation_shopify_checkouts' as never).select('shop,email,variant_id,reference_version').eq('order_id', event.orderId).maybeSingle(),
      admin.from('initiation_orders').select('user_id,order_kind,amount,pricing_version,membership_order_id,initial_order_id,created_at,analytics_context').eq('id', event.orderId).maybeSingle(),
    ])
    if (bound.error || order.error) return respond(503)
    const checkout = bound.data as { shop: string; email: string; variant_id: string; reference_version: number } | null
    const source = order.data as { user_id: string; order_kind: InitiationOrderKind; amount: number; pricing_version: string | null; membership_order_id: string | null; initial_order_id: string | null; created_at: string; analytics_context: Record<string, unknown> } | null
    if (!checkout || !source || checkout.shop !== config.shop || !['membership', 'initial', 'standard', 'legacy_upgrade'].includes(source.order_kind)) return respond(403)
    const expected = shopifyLiveReservationReference({ id: event.orderId, userId: source.user_id, shop: checkout.shop,
      email: checkout.email, kind: source.order_kind, variantId: checkout.variant_id, referenceVersion: checkout.reference_version, amount: source.amount,
      pricingVersion: source.pricing_version, membershipOrderId: source.membership_order_id, initialOrderId: source.initial_order_id }, config.clientSecret)
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(event.reference))) return respond(403)
    if (Date.parse(event.timestamp) < Date.parse(source.created_at) - 60000) return respond(400)
    if (source.analytics_context.disabled === true) return respond(204)
    // Preserve the first-stage funnel while separately retaining each repeated Shopify occurrence.
    if (stage) {
      const saved = await admin.from('initiation_analytics_outbox' as never).upsert({ order_id: event.orderId,
        event: stage.event, event_time: event.timestamp, capture_source: 'shopify_pixel',
      } as never, { onConflict: 'order_id,event', ignoreDuplicates: true })
      if (saved.error) return respond(503)
    }
    if (diagnostic) {
      const saved = await admin.from('initiation_checkout_diagnostics' as never).upsert({ order_id: event.orderId,
        event_key: shopifyDiagnosticKey(diagnostic.event, diagnostic.eventId), event: diagnostic.event,
        event_time: diagnostic.timestamp, capture_source: 'shopify_pixel', properties: diagnostic.properties,
      } as never, { onConflict: 'order_id,event_key', ignoreDuplicates: true })
      if (saved.error) return respond(503)
    }
    afterCheckout(() => Promise.all([
      ...(stage ? [sendPendingInitiationAnalytics(admin, null, { orderId: event.orderId, limit: 5 })] : []),
      ...(diagnostic ? [sendPendingShopifyCheckoutDiagnostics(admin, { orderId: event.orderId, limit: 10 })] : []),
    ]).then(() => {}),
      '[initiation-analytics] Shopify customer event deferred to the outbox')
    return respond(204)
  } catch { return respond(503) }
}
