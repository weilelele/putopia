export interface WebSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// Only public push providers supported by this rollout. Never fetch arbitrary
// URLs supplied by clients (including redirects or private-network hosts).
export function parseWebSubscription(input: unknown): WebSubscription {
  const value = input as Partial<WebSubscription> | null
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) throw new Error('Invalid subscription')
  const url = new URL(value.endpoint)
  const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com'
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) throw new Error('Unsupported push provider')
  if (!url.pathname.startsWith('/')) throw new Error('Invalid endpoint')
  const p256dh = value.keys?.p256dh ?? ''
  const auth = value.keys?.auth ?? ''
  if (!/^[A-Za-z0-9_-]{87}=?$/.test(p256dh) || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(auth)) throw new Error('Invalid subscription keys')
  return { endpoint: url.href, keys: { p256dh, auth } }
}

export function pushRoute(input: unknown): string {
  if (typeof input !== 'string' || input.length > 1000 || !input.startsWith('/') || input.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(input)) throw new Error('Use a relative Console link')
  const url = new URL(input, 'https://www.multiverseco.org')
  if (url.origin !== 'https://www.multiverseco.org') throw new Error('Invalid route')
  return url.pathname + url.search + url.hash
}

export function parseWebCampaign(input: unknown) {
  const value = input as Record<string, unknown> | null
  if (!value || typeof value.campaignKey !== 'string' || !/^[a-zA-Z0-9_-]{3,80}$/.test(value.campaignKey)) throw new Error('Invalid campaign key')
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 80) throw new Error('Title must be 1–80 characters')
  if (typeof value.body !== 'string' || !value.body.trim() || value.body.length > 180) throw new Error('Body must be 1–180 characters')
  const userIds = value.userIds
  if (!Array.isArray(userIds) || !userIds.length || userIds.length > 100 || userIds.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error('Provide 1–100 explicit user IDs')
  return { campaignKey: value.campaignKey, title: value.title.trim(), body: value.body.trim(), route: pushRoute(value.route), userIds: [...new Set(userIds)] as string[] }
}

export function canSendWebPush(enabled: string | undefined, action: unknown, confirm: unknown, campaignKey: string) {
  return enabled === 'true' && action === 'send' && confirm === campaignKey
}

export const WEB_PUSH_BATCH_SIZE = 5

export function parseWebCampaignCursor(input: unknown): string | null {
  if (input === undefined || input === null) return null
  if (typeof input !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) throw new Error('Invalid subscription cursor')
  return input
}
