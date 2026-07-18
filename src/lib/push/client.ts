// Client-side Web Push helpers. Shared by EnableNotifications (manual opt-in on
// /profile) and NotificationPrompt (the auto soft-prompt). Server-side sending
// lives in ./send.ts. Gate UI on platform.canWebPush before calling these.

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// VAPID public keys are base64url; the Push API wants an ArrayBuffer-backed view.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'denied' | 'error' }

/**
 * Request notification permission (must be called from a user gesture), then
 * subscribe and persist the subscription server-side. Idempotent — reuses an
 * existing subscription if present.
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'unconfigured' }
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub),
    })
    return res.ok ? { ok: true } : { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** True if this browser already has an active push subscription. */
export async function hasActiveSubscription(): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false
  }
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) != null
}
