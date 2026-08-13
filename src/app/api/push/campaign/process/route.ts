import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push/apns'
import { authorizePushCampaign, campaignDb } from '@/lib/push/campaign-server'

export const runtime = 'nodejs'
export const maxDuration = 60

type ClaimedRecipient = {
  id: number
  user_id: string
  title: string
  body: string
  route: string
}
async function updateCampaignCounts(campaignId: string) {
  const admin = campaignDb()
  const statuses = ['queued', 'processing', 'sent', 'failed', 'skipped'] as const
  const counts = Object.fromEntries(await Promise.all(statuses.map(async (status) => {
    const { count } = await admin
      .from('push_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', status)
    return [status, count ?? 0]
  }))) as Record<(typeof statuses)[number], number>
  const remaining = counts.queued + counts.processing
  const now = new Date().toISOString()
  await admin.from('push_campaigns').update({
    status: remaining ? 'sending' : 'completed',
    sent_recipients: counts.sent,
    failed_recipients: counts.failed,
    skipped_recipients: counts.skipped,
    completed_at: remaining ? null : now,
    updated_at: now,
  }).eq('id', campaignId)
  return { ...counts, remaining }
}

export async function POST(request: Request) {
  try {
    await authorizePushCampaign(request)
    const body = await request.json().catch(() => null) as { campaignKey?: unknown; batchSize?: unknown } | null
    const campaignKey = typeof body?.campaignKey === 'string' ? body.campaignKey : ''
    const batchSize = Math.max(1, Math.min(25, Number(body?.batchSize ?? 20) || 20))
    if (!campaignKey) return NextResponse.json({ error: 'campaignKey is required' }, { status: 400 })

    const admin = campaignDb()
    const { data: campaign, error } = await admin
      .from('push_campaigns')
      .select('id, status')
      .eq('campaign_key', campaignKey)
      .maybeSingle()
    if (error) throw new Error(`Could not load campaign: ${error.message}`)
    if (!campaign || !['queued', 'sending'].includes(campaign.status)) {
      return NextResponse.json({ error: 'Campaign is not queued for delivery' }, { status: 409 })
    }

    await admin.from('push_campaigns').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', campaign.id)
    const { data: claimed, error: claimError } = await admin.rpc('claim_push_campaign_recipients', {
      p_campaign_id: campaign.id,
      p_limit: batchSize,
    })
    if (claimError) throw new Error(`Could not claim recipients: ${claimError.message}`)

    const recipients = (claimed ?? []) as ClaimedRecipient[]
    const results = await Promise.all(recipients.map(async (recipient) => {
      try {
        const delivery = await sendPushToUser(recipient.user_id, {
          eventType: 'campaign',
          title: recipient.title,
          body: recipient.body,
          route: recipient.route,
          collapseId: `campaign-${campaignKey}`,
        })
        const status = !delivery.configured
          ? 'failed'
          : delivery.delivered > 0
            ? 'sent'
            : delivery.attempted > 0
              ? 'failed'
              : 'skipped'
        const errorMessage = !delivery.configured
          ? 'APNs is not configured'
          : status === 'failed'
            ? 'No device accepted the notification'
            : status === 'skipped'
              ? 'No eligible device or notifications disabled'
              : null
        await admin.from('push_campaign_recipients').update({
          status,
          attempted_devices: delivery.attempted,
          delivered_devices: delivery.delivered,
          error: errorMessage,
          processed_at: new Date().toISOString(),
        }).eq('id', recipient.id)
        return { id: recipient.id, status }
      } catch (deliveryError) {
        const message = deliveryError instanceof Error ? deliveryError.message : 'Unknown delivery error'
        await admin.from('push_campaign_recipients').update({
          status: 'failed',
          error: message.slice(0, 500),
          processed_at: new Date().toISOString(),
        }).eq('id', recipient.id)
        return { id: recipient.id, status: 'failed' }
      }
    }))

    const counts = await updateCampaignCounts(campaign.id)
    return NextResponse.json({ campaignKey, processed: results.length, results, counts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message === 'Architect access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
