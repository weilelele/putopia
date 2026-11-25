import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { shopifyLiveConfig } from '@/lib/shopify-live-config'
import { verifyShopifyLiveWebhook } from '@/lib/shopify-live-order'
import { reconcileShopifyLiveQueue } from '@/lib/shopify-live-reconciliation'
import { retryShopifyPaymentMetadata } from '@/lib/shopify-payment-metadata-queue'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const config = shopifyLiveConfig()
  if (!config) return new Response(null,{status:404})
  const body = await request.text()
  const topic = verifyShopifyLiveWebhook(body,request.headers,{shop:config.shop,secret:config.clientSecret})
  if (!topic) return new Response(null,{status:401})
  const event = request.headers.get('x-shopify-event-id')
  if (!event || !/^[0-9a-f-]{36}$/i.test(event)) return new Response(null,{status:400})
  let payload: {id?:unknown;order_id?:unknown;admin_graphql_api_id?:unknown;test?:boolean}
  try { payload=JSON.parse(body) } catch { return new Response(null,{status:400}) }
  if (!payload || typeof payload !== 'object') return new Response(null,{status:400})
  if (payload.test===true) return new Response(null,{status:204})
  const orderEvent=topic.startsWith('orders/')
  const gid=orderEvent && typeof payload.admin_graphql_api_id==='string' ? payload.admin_graphql_api_id
    : typeof payload.order_id==='number' && Number.isSafeInteger(payload.order_id) ? `gid://shopify/Order/${payload.order_id}` : null
  if (!gid || !/^gid:\/\/shopify\/Order\/\d+$/.test(gid)) return new Response(null,{status:400})
  const queued=await createAdminClient().from('initiation_shopify_events' as never).upsert({
    shop:config.shop, order_gid:gid, event_id:event, received_at:new Date().toISOString(),
  } as never,{onConflict:'shop,order_gid'})
  if (queued.error) return new Response(null,{status:503})
  after(async()=>{
    try { await reconcileShopifyLiveQueue(config,gid) } catch { console.error('[shopify] Webhook order will retry from the queue') }
    try { await retryShopifyPaymentMetadata(config) } catch { console.warn('[shopify-observation] Payment metadata will retry independently') }
  })
  return new Response(null,{status:204})
}
