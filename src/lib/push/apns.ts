import 'server-only'

import { createPrivateKey, sign } from 'node:crypto'
import { connect } from 'node:http2'
import { createAdminClient } from '@/lib/supabase/server'

export type PushEventType =
  | 'comment_reply'
  | 'signal_available'
  | 'signal_recall'
  | 'world_confirmed'
  | 'world_scan_failed'
  | 'vote_opened'
  | 'device_update'
  | 'intel_published'
  | 'story_published'
  | 'campaign'
  | 'test'

type PreferenceKey = 'replies' | 'signal' | 'worlds' | 'votes' | 'devices' | 'intel' | 'stories' | 'announcements'

const EVENT_PREFERENCE: Record<PushEventType, PreferenceKey | null> = {
  comment_reply: 'replies',
  signal_available: 'signal',
  signal_recall: 'signal',
  world_confirmed: 'worlds',
  world_scan_failed: 'worlds',
  vote_opened: 'votes',
  device_update: 'devices',
  intel_published: 'intel',
  story_published: 'stories',
  campaign: 'announcements',
  test: null,
}

interface PushMessage {
  eventType: PushEventType
  title: string
  body: string
  route: string
  collapseId?: string
}

interface PushDevice {
  id: string
  token: string
  environment: 'development' | 'production'
}

interface ApnsResult {
  ok: boolean
  status: number
  reason: string | null
}

export type PushFailureReason =
  | 'not_configured'
  | 'storage_unavailable'
  | 'preferences_disabled'
  | 'no_registered_devices'
  | 'provider_rejected'

export interface PushSendResult {
  delivered: number
  attempted: number
  configured: boolean
  reason?: PushFailureReason
}

let cachedJwt: { value: string; issuedAt: number } | null = null

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

function apnsJwt(): string | null {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const rawKey = process.env.APNS_PRIVATE_KEY
  if (!keyId || !teamId || !rawKey) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedJwt && now - cachedJwt.issuedAt < 45 * 60) return cachedJwt.value

  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }))
  const unsigned = `${header}.${claims}`
  const key = createPrivateKey(rawKey.replace(/\\n/g, '\n'))
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' })
  const value = `${unsigned}.${base64url(signature)}`
  cachedJwt = { value, issuedAt: now }
  return value
}

function validRoute(route: string): string {
  return route.startsWith('/') && !route.startsWith('//') ? route : '/console'
}

function sendApns(device: PushDevice, message: PushMessage, jwt: string): Promise<ApnsResult> {
  const host = device.environment === 'development'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com'
  const topic = process.env.APNS_TOPIC ?? 'org.multiverseco.collective'
  const payload = JSON.stringify({
    aps: {
      alert: { title: message.title.slice(0, 100), body: message.body.slice(0, 240) },
      sound: 'default',
    },
    route: validRoute(message.route),
    eventType: message.eventType,
  })

  return new Promise((resolve) => {
    const client = connect(host)
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | null = null
    const finish = (result: ApnsResult) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      client.destroy()
      resolve(result)
    }
    client.once('error', (error) => finish({ ok: false, status: 0, reason: error.message }))

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${encodeURIComponent(device.token)}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
      ...(message.collapseId ? { 'apns-collapse-id': message.collapseId.slice(0, 64) } : {}),
    })
    let status = 0
    let response = ''
    request.setEncoding('utf8')
    request.on('response', (headers) => { status = Number(headers[':status'] ?? 0) })
    request.on('data', (chunk) => { response += chunk })
    request.on('end', () => {
      let reason: string | null = null
      if (response) {
        try { reason = (JSON.parse(response) as { reason?: string }).reason ?? response }
        catch { reason = response }
      }
      finish({ ok: status === 200, status, reason })
    })
    request.once('error', (error) => finish({ ok: false, status, reason: error.message }))
    timeout = setTimeout(() => finish({ ok: false, status: 0, reason: 'APNs request timed out' }), 10_000)
    request.end(payload)
  })
}

export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<PushSendResult> {
  let jwt: string | null = null
  try {
    jwt = apnsJwt()
  } catch (error) {
    console.error('[push] Invalid APNs configuration.', error)
  }
  if (!jwt) {
    return { delivered: 0, attempted: 0, configured: false, reason: 'not_configured' }
  }

  const admin = createAdminClient()
  const preference = EVENT_PREFERENCE[message.eventType]
  if (preference) {
    const { data: row, error } = await (admin.from('push_preferences' as never) as ReturnType<typeof admin.from>)
      .select(preference)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('[push] Could not read push preferences.', error)
      return { delivered: 0, attempted: 0, configured: true, reason: 'storage_unavailable' }
    }
    const preferences = row as Record<string, boolean> | null
    if (preferences && preferences[preference] === false) {
      return { delivered: 0, attempted: 0, configured: true, reason: 'preferences_disabled' }
    }
  }

  const { data, error: devicesError } = await (admin.from('push_devices' as never) as ReturnType<typeof admin.from>)
    .select('id, token, environment')
    .eq('user_id', userId)
    .eq('platform', 'ios')
    .eq('enabled', true)
  if (devicesError) {
    console.error('[push] Could not read registered push devices.', devicesError)
    return { delivered: 0, attempted: 0, configured: true, reason: 'storage_unavailable' }
  }
  const devices = (data ?? []) as PushDevice[]
  if (devices.length === 0) {
    return { delivered: 0, attempted: 0, configured: true, reason: 'no_registered_devices' }
  }
  let delivered = 0

  for (const device of devices) {
    const result = await sendApns(device, message, jwt)
    if (result.ok) delivered += 1
    if (result.status === 410 || result.reason === 'BadDeviceToken' || result.reason === 'Unregistered') {
      await (admin.from('push_devices' as never) as ReturnType<typeof admin.from>)
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('id', device.id)
    }
    const { error: logError } = await (admin.from('push_delivery_log' as never) as ReturnType<typeof admin.from>).insert({
      user_id: userId,
      device_id: device.id,
      event_type: message.eventType,
      route: validRoute(message.route),
      status: result.ok ? 'sent' : 'failed',
      provider_status: result.status || null,
      provider_reason: result.reason,
    })
    if (logError) console.error('[push] Could not write delivery audit log.', logError)
  }

  return {
    delivered,
    attempted: devices.length,
    configured: true,
    ...(delivered === 0 ? { reason: 'provider_rejected' as const } : {}),
  }
}
