import { createHash } from 'node:crypto'
import { parseWebSubscription } from '@/lib/push/web-model'
import { sameOrigin, webPushConfig, webPushDb, webPushUser } from '@/lib/push/web-server'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  let config
  try { config = await webPushConfig() } catch { return Response.json({ error: 'Notifications are not configured yet.' }, { status: 503, headers }) }
  const user = await webPushUser()
  let endpointHashes: string[] = []
  if (user) {
    const { data, error } = await webPushDb().from('web_push_subscriptions').select('endpoint_hash').eq('user_id', user.id).eq('enabled', true).limit(100)
    if (error) return Response.json({ error: 'Subscription storage unavailable' }, { status: 503, headers })
    endpointHashes = (data ?? []).map((row: { endpoint_hash: string }) => row.endpoint_hash)
  }
  return Response.json({ publicKey: config.public_key, sendingEnabled: config.sending_enabled, endpointHashes }, { headers })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const user = await webPushUser()
  if (!user) return Response.json({ error: 'Please log in to enable notifications.' }, { status: 401 })
  try { await webPushConfig() } catch { return Response.json({ error: 'Notifications are not configured yet.' }, { status: 503 }) }
  try {
    if (Number(request.headers.get('content-length') || 0) > 8192) throw new Error('Request too large')
    const body = await request.json()
    if (body.consent !== true) throw new Error('Notification consent is required')
    const subscription = parseWebSubscription(body.subscription)
    const db = webPushDb()
    const endpointHash = createHash('sha256').update(subscription.endpoint).digest('hex')
    const { data: existing, error: lookupError } = await db.from('web_push_subscriptions').select('user_id').eq('endpoint_hash', endpointHash).maybeSingle()
    if (lookupError) throw new Error('Subscription storage unavailable')
    if (existing && existing.user_id !== user.id) return Response.json({ error: 'Remove this browser subscription from its previous account first.' }, { status: 409 })
    const now = new Date().toISOString()
    const record = { user_id: user.id, endpoint_hash: endpointHash, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, enabled: true, consent_at: now, consent_version: 'console-updates-v1', updated_at: now }
    const { error } = existing
      ? await db.from('web_push_subscriptions').update(record).eq('endpoint_hash', endpointHash).eq('user_id', user.id)
      : await db.from('web_push_subscriptions').insert(record)
    if (error) return Response.json({ error: 'Could not save notification subscription.' }, { status: 503 })
    return Response.json({ subscribed: true }, { headers })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid subscription' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const user = await webPushUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (typeof body?.endpoint !== 'string' || body.endpoint.length > 2048) return Response.json({ error: 'Endpoint is required' }, { status: 400 })
  const endpointHash = createHash('sha256').update(body.endpoint).digest('hex')
  const { error } = await webPushDb().from('web_push_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() }).eq('endpoint_hash', endpointHash).eq('user_id', user.id)
  if (error) return Response.json({ error: 'Could not disable notifications.' }, { status: 503 })
  return Response.json({ unsubscribed: true }, { headers })
}
