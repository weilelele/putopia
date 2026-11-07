import { createHash } from 'node:crypto'
import webpush from 'web-push'
import { authorizeWebCampaign, webPushConfig, webPushDb } from '@/lib/push/web-server'
import { canSendWebPush, parseWebCampaign, parseWebCampaignCursor, parseWebSubscription, WEB_PUSH_BATCH_SIZE } from '@/lib/push/web-model'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await authorizeWebCampaign(request)
    const body = await request.json()
    const spec = parseWebCampaign(body.spec)
    const config = await webPushConfig()
    const action = body.action ?? 'preview'
    if (action !== 'preview' && action !== 'send') return Response.json({ error: 'Use preview or send' }, { status: 400 })
    if (action === 'send' && !canSendWebPush(String(config.sending_enabled), action, body.confirm, spec.campaignKey)) return Response.json({ error: 'Real sending is locked. Enable the server flag and confirm the exact campaign key after operator approval.' }, { status: 423 })
    const cursor = parseWebCampaignCursor(body.cursor)
    const db = webPushDb()
    let query = db.from('web_push_subscriptions').select('id,user_id,endpoint,p256dh,auth').eq('enabled', true).in('user_id', spec.userIds).order('id').limit(WEB_PUSH_BATCH_SIZE + 1)
    if (cursor) query = query.gt('id', cursor)
    const { data, error } = await query
    if (error) return Response.json({ error: 'Subscription storage unavailable' }, { status: 503 })
    const batch = data.slice(0, WEB_PUSH_BATCH_SIZE)
    const nextCursor = data.length > WEB_PUSH_BATCH_SIZE ? batch[batch.length - 1].id : null
    const message = { campaignKey: spec.campaignKey, title: spec.title, body: spec.body, route: spec.route }
    const specHash = createHash('sha256').update(JSON.stringify(spec)).digest('hex')
    if (action === 'preview') return Response.json({ dryRun: true, sendingEnabled: config.sending_enabled, eligibleDevices: batch.length, eligibleUsers: new Set(batch.map((row: { user_id: string }) => row.user_id)).size, nextCursor, message, specHash }, { headers: { 'Cache-Control': 'no-store' } })
    const { public_key: publicKey, private_key: privateKey, subject } = config
    const results: { subscriptionId: string; status: string }[] = []
    // Claim before contacting the provider. A campaign/subscription pair is sent
    // at most once, including concurrent requests and uncertain network failures.
    for (const row of batch) {
      const subscription = parseWebSubscription({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } })
      const { data: log, error: claimError } = await db.from('web_push_deliveries').insert({ campaign_key: spec.campaignKey, spec_hash: specHash, subscription_id: row.id, user_id: row.user_id, route: spec.route, status: 'sending' }).select('id,event_token').single()
      if (claimError?.code === '23505') { results.push({ subscriptionId: row.id, status: 'duplicate_skipped' }); continue }
      if (claimError || !log) throw new Error('Could not record send attempt')
      // Re-check opt-out after the claim, immediately before any provider call.
      const { data: current, error: currentError } = await db.from('web_push_subscriptions').select('enabled').eq('id', row.id).maybeSingle()
      if (currentError || !current?.enabled) {
        await db.from('web_push_deliveries').update({ status: 'skipped' }).eq('id', log.id)
        results.push({ subscriptionId: row.id, status: 'skipped' }); continue
      }
      try {
        const response = await webpush.sendNotification(subscription, JSON.stringify({ title: spec.title, body: spec.body, route: spec.route, tag: spec.campaignKey, eventToken: log.event_token }), { TTL: 3600, timeout: 10000, urgency: 'normal', vapidDetails: { subject, publicKey, privateKey }, proxy: undefined })
        const { error: logError } = await db.from('web_push_deliveries').update({ status: 'provider_accepted', provider_status: response.statusCode }).eq('id', log.id)
        results.push({ subscriptionId: row.id, status: logError ? 'accepted_log_unconfirmed' : 'provider_accepted' })
      } catch (error) {
        const code = Number((error as { statusCode?: number }).statusCode || 0)
        await db.from('web_push_deliveries').update({ status: 'failed', provider_status: code }).eq('id', log.id)
        if (code === 404 || code === 410) await db.from('web_push_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() }).eq('id', row.id)
        results.push({ subscriptionId: row.id, status: 'failed' })
      }
    }
    return Response.json({ campaignKey: spec.campaignKey, results, nextCursor })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 })
  }
}
