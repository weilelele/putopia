import { NextResponse } from 'next/server'
import {
  campaignSpecHash,
  parseCampaignSpec,
  renderCampaignForProfile,
  type PushCampaignSpec,
} from '@/lib/push/campaign'
import {
  authorizePushCampaign,
  campaignDb,
  chunkValues,
  loadCampaignProfile,
  loadCampaignProfiles,
} from '@/lib/push/campaign-server'
import { sendPushToUser } from '@/lib/push/apns'

export const runtime = 'nodejs'
export const maxDuration = 60

type CampaignRequest = {
  action?: unknown
  spec?: unknown
  testUserId?: unknown
  confirm?: unknown
  campaignKey?: unknown
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const status = message === 'Unauthorized' ? 401 : message === 'Architect access required' ? 403 : 400
  return NextResponse.json({ error: message }, { status })
}

async function preview(spec: PushCampaignSpec) {
  const profiles = await loadCampaignProfiles(spec.audience)
  const rendered = profiles.map((profile) => renderCampaignForProfile(spec, profile))
  return NextResponse.json({
    campaignKey: spec.campaignKey,
    eligibleRecipients: rendered.length,
    samples: rendered.slice(0, 5),
  })
}

async function testCampaign(spec: PushCampaignSpec, testUserId: string, actorId: string | null, actorLabel: string) {
  const profile = await loadCampaignProfile(testUserId)
  if (!profile) return NextResponse.json({ error: 'Test user has no enabled iOS push device' }, { status: 422 })
  const rendered = renderCampaignForProfile(spec, profile)
  const delivery = await sendPushToUser(profile.id, {
    eventType: 'campaign',
    title: rendered.title,
    body: rendered.body,
    route: rendered.route,
    collapseId: `campaign-test-${spec.campaignKey}`,
  })
  if (delivery.delivered < 1) {
    return NextResponse.json({ error: 'Test notification was not delivered', delivery, rendered }, { status: 422 })
  }

  const admin = campaignDb()
  const specHash = campaignSpecHash(spec)
  const { data: existing } = await admin
    .from('push_campaigns')
    .select('id, status')
    .eq('campaign_key', spec.campaignKey)
    .maybeSingle()
  if (existing && existing.status !== 'draft') {
    return NextResponse.json({ error: 'Campaign key has already been queued or completed' }, { status: 409 })
  }
  const now = new Date().toISOString()
  const { error } = await admin.from('push_campaigns').upsert({
    campaign_key: spec.campaignKey,
    spec_hash: specHash,
    title_template: spec.title,
    body_template: spec.body,
    route_template: spec.route,
    audience: spec.audience,
    variables: spec.variables ?? {},
    status: 'draft',
    requested_by: actorId,
    requested_by_label: actorLabel,
    test_user_id: profile.id,
    test_delivered_at: now,
    updated_at: now,
  }, { onConflict: 'campaign_key' })
  if (error) throw new Error(`Could not record test delivery: ${error.message}`)
  return NextResponse.json({ tested: true, campaignKey: spec.campaignKey, rendered, delivery })
}

async function queueCampaign(spec: PushCampaignSpec, confirm: string, actorId: string | null, actorLabel: string) {
  if (confirm !== spec.campaignKey) {
    return NextResponse.json({ error: 'Confirmation must exactly match campaignKey' }, { status: 400 })
  }
  const admin = campaignDb()
  const { data: campaign, error: campaignError } = await admin
    .from('push_campaigns')
    .select('id, status, spec_hash, test_delivered_at')
    .eq('campaign_key', spec.campaignKey)
    .maybeSingle()
  if (campaignError) throw new Error(`Could not load tested campaign: ${campaignError.message}`)
  if (!campaign || campaign.status !== 'draft') {
    return NextResponse.json({ error: 'Run a successful test before queueing this campaign' }, { status: 409 })
  }
  if (campaign.spec_hash !== campaignSpecHash(spec)) {
    return NextResponse.json({ error: 'Campaign changed after its test; test the current copy again' }, { status: 409 })
  }
  const testedAt = new Date(campaign.test_delivered_at ?? 0).getTime()
  if (!testedAt || Date.now() - testedAt > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Campaign test is older than 24 hours; test again' }, { status: 409 })
  }

  const profiles = await loadCampaignProfiles(spec.audience)
  const recipients = profiles.map((profile) => renderCampaignForProfile(spec, profile))
  if (!recipients.length) return NextResponse.json({ error: 'No eligible recipients with enabled iOS devices' }, { status: 422 })

  await admin.from('push_campaign_recipients').delete().eq('campaign_id', campaign.id)
  for (const batch of chunkValues(recipients, 500)) {
    const { error } = await admin.from('push_campaign_recipients').insert(batch.map((recipient) => ({
      campaign_id: campaign.id,
      user_id: recipient.userId,
      title: recipient.title,
      body: recipient.body,
      route: recipient.route,
      status: 'queued',
    })))
    if (error) {
      await admin.from('push_campaign_recipients').delete().eq('campaign_id', campaign.id)
      throw new Error(`Could not queue campaign recipients: ${error.message}`)
    }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await admin.from('push_campaigns').update({
    status: 'queued',
    requested_by: actorId,
    requested_by_label: actorLabel,
    total_recipients: recipients.length,
    sent_recipients: 0,
    failed_recipients: 0,
    skipped_recipients: 0,
    queued_at: now,
    completed_at: null,
    updated_at: now,
  }).eq('id', campaign.id).eq('status', 'draft')
  if (updateError) throw new Error(`Could not queue campaign: ${updateError.message}`)
  return NextResponse.json({ queued: true, campaignKey: spec.campaignKey, recipients: recipients.length })
}

async function campaignStatus(campaignKey: string) {
  const admin = campaignDb()
  const { data, error } = await admin
    .from('push_campaigns')
    .select('campaign_key, status, total_recipients, sent_recipients, failed_recipients, skipped_recipients, test_delivered_at, queued_at, completed_at')
    .eq('campaign_key', campaignKey)
    .maybeSingle()
  if (error) throw new Error(`Could not load campaign status: ${error.message}`)
  if (!data) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const { actorId, actorLabel } = await authorizePushCampaign(request)
    const body = await request.json().catch(() => null) as CampaignRequest | null
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    if (body.action === 'status') {
      const campaignKey = typeof body.campaignKey === 'string' ? body.campaignKey : ''
      if (!campaignKey) return NextResponse.json({ error: 'campaignKey is required' }, { status: 400 })
      return campaignStatus(campaignKey)
    }

    const spec = parseCampaignSpec(body.spec)
    if (body.action === 'preview') return preview(spec)
    if (body.action === 'test') {
      const testUserId = typeof body.testUserId === 'string' ? body.testUserId : ''
      if (!testUserId) return NextResponse.json({ error: 'testUserId is required' }, { status: 400 })
      return testCampaign(spec, testUserId, actorId, actorLabel)
    }
    if (body.action === 'queue') {
      const confirm = typeof body.confirm === 'string' ? body.confirm : ''
      return queueCampaign(spec, confirm, actorId, actorLabel)
    }
    return NextResponse.json({ error: 'action must be preview, test, queue, or status' }, { status: 400 })
  } catch (error) {
    return errorResponse(error)
  }
}
