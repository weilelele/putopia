import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'
import type { PushSubscriptionRow } from '@/types/database'

// VAPID identity. The private key is server-only; the public key is also exposed
// to the client as NEXT_PUBLIC_VAPID_PUBLIC_KEY for pushManager.subscribe().
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:misteror.ywl@gmail.com'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
  configured = true
  return true
}

export function isPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY)
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
}

export interface PushSendResult {
  sent: number
  failed: number
  pruned: number
}

/**
 * Send a push notification to every subscription belonging to a user.
 * Dead subscriptions (404/410 — browser dropped them) are pruned automatically.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!ensureConfigured()) {
    throw new Error('Web Push is not configured (missing VAPID keys).')
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to load push subscriptions: ${error.message}`)

  const subs = (data ?? []) as PushSubscriptionRow[]
  const body = JSON.stringify(payload)
  const result: PushSendResult = { sent: 0, failed: 0, pruned: 0 }

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
        result.sent++
      } catch (err: unknown) {
        result.failed++
        const status =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined
        // 404/410 = subscription is gone; remove it so we stop retrying.
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          result.pruned++
        }
      }
    }),
  )

  return result
}
