import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { shopifyLiveConfig } from '@/lib/shopify-live-config'
import { shopifyLiveReservationReference } from '@/lib/shopify-live-order'
import { parseShopifyCustomerEvent } from '@/lib/shopify-customer-events'
import { afterCheckout } from '@/lib/checkout-after'
import { sendPendingInitiationAnalytics } from '@/lib/initiation-analytics-outbox'

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
    const event = parseShopifyCustomerEvent(value, Date.now())
    if (!event) return respond(400)
    const admin = createAdminClient()
    const [bound, order] = await Promise.all([
      admin.from('initiation_shopify_checkouts' as never).select('shop,email,variant_id').eq('order_id', event.orderId).maybeSingle(),
      admin.from('initiation_orders').select('user_id,order_kind,created_at,analytics_context').eq('id', event.orderId).maybeSingle(),
    ])
    if (bound.error || order.error) return respond(503)
    const checkout = bound.data as { shop: string; email: string; variant_id: string } | null
    const source = order.data as { user_id: string; order_kind: 'initial' | 'standard'; created_at: string; analytics_context: Record<string, unknown> } | null
    if (!checkout || !source || checkout.shop !== config.shop || !['initial', 'standard'].includes(source.order_kind)) return respond(403)
    const expected = shopifyLiveReservationReference({ id: event.orderId, userId: source.user_id, shop: checkout.shop,
      email: checkout.email, kind: source.order_kind, variantId: checkout.variant_id }, config.clientSecret)
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(event.reference))) return respond(403)
    if (Date.parse(event.timestamp) < Date.parse(source.created_at) - 60000) return respond(400)
    if (source.analytics_context.disabled === true) return respond(204)
    // The first occurrence of each stage is durable. A replay cannot reset its time or event UUID.
    const saved = await admin.from('initiation_analytics_outbox' as never).upsert({ order_id: event.orderId,
      event: event.event, event_time: event.timestamp, capture_source: 'shopify_pixel',
    } as never, { onConflict: 'order_id,event', ignoreDuplicates: true })
    if (saved.error) return respond(503)
    afterCheckout(() => sendPendingInitiationAnalytics(admin, null, { orderId: event.orderId, limit: 5 }),
      '[initiation-analytics] Shopify customer event deferred to the outbox')
    return respond(204)
  } catch { return respond(503) }
}
