import { describe, it, expect } from 'vitest'
import { createECDH, randomBytes } from 'node:crypto'
import webpush from 'web-push'
import { canSendWebPush, parseWebCampaign, parseWebSubscription, pushRoute } from './web-model'

const user = '12345678-1234-1234-1234-123456789abc'
function subscription() {
  const client = createECDH('prime256v1')
  client.generateKeys()
  return { endpoint: 'https://fcm.googleapis.com/fcm/send/example', keys: { p256dh: client.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } }
}

describe('Android Web Push preparation', () => {
  it('fails closed until both an explicit send action and confirmation are present', () => {
    for (const flag of [undefined, '', 'false', 'TRUE']) expect(canSendWebPush(flag, 'send', 'launch', 'launch')).toBe(false)
    expect(canSendWebPush('true', 'preview', 'launch', 'launch')).toBe(false)
    expect(canSendWebPush('true', 'send', 'other', 'launch')).toBe(false)
    expect(canSendWebPush('true', 'send', 'launch', 'launch')).toBe(true)
  })
  it('rejects private networks, credentialed URLs, arbitrary providers and malformed keys', () => {
    for (const endpoint of ['http://fcm.googleapis.com/send/a', 'https://127.0.0.1/a', 'https://169.254.169.254/latest/meta-data/', 'https://fcm.googleapis.com.evil.example/a', 'https://u:p@fcm.googleapis.com/a', 'https://fcm.googleapis.com:8443/a']) expect(() => parseWebSubscription({ ...subscription(), endpoint })).toThrow()
    expect(() => parseWebSubscription({ ...subscription(), keys: { p256dh: 'bad', auth: 'bad' } })).toThrow()
  })
  it('builds a signed encrypted request without contacting any push provider', () => {
    const device = parseWebSubscription(subscription())
    const vapid = webpush.generateVAPIDKeys()
    const body = JSON.stringify({ title: 'Multiverse', body: 'Preview only', route: '/console' })
    const request = webpush.generateRequestDetails(device, body, { TTL: 3600, vapidDetails: { subject: 'https://www.multiverseco.org', ...vapid } })
    expect(request.endpoint).toBe(device.endpoint)
    expect(request.headers.Authorization).toContain('vapid ')
    expect(request.headers['Content-Encoding']).toBe('aes128gcm')
    expect(request.body?.toString()).not.toContain('Preview only')
  })
  it('requires explicit recipients and safe same-site links', () => {
    expect(() => parseWebCampaign({ campaignKey: 'launch', title: 'Hi', body: 'Open Console', route: '/console', userIds: [] })).toThrow()
    for (const route of ['//evil.example', '/\\evil.example', 'https://evil.example', '/\n/evil.example']) expect(() => pushRoute(route)).toThrow()
    const spec = parseWebCampaign({ campaignKey: 'launch', title: 'Hi', body: 'Open Console', route: '/voyager-initiation?briefing=1', userIds: [user, user] })
    expect(spec.userIds).toEqual([user])
    expect(spec.route).toBe('/voyager-initiation?briefing=1')
  })
})
