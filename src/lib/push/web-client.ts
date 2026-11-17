const WORKER_UPDATE_MESSAGE = 'Close all Console tabs and reopen the Console before enabling notifications.'

function supportsWebPush(worker: ServiceWorker | null): Promise<boolean> {
  if (!worker || worker.state !== 'activated') return Promise.resolve(false)
  return new Promise(resolve => {
    const channel = new MessageChannel()
    const finish = (ready: boolean) => {
      clearTimeout(timer)
      channel.port1.close()
      channel.port2.close()
      resolve(ready)
    }
    const timer = setTimeout(() => finish(false), 1500)
    channel.port1.onmessage = event => finish(event.data?.webPush === 1)
    try { worker.postMessage({ type: 'WEB_PUSH_CAPABILITIES' }, [channel.port2]) }
    catch { finish(false) }
  })
}

function activatePushWorker(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    let requested = false
    const finish = (error?: Error) => {
      clearTimeout(timer)
      worker.removeEventListener('statechange', check)
      if (error) reject(error)
      else resolve()
    }
    const check = () => {
      if (worker.state === 'activated') finish()
      else if (worker.state === 'redundant') finish(new Error(WORKER_UPDATE_MESSAGE))
      else if (worker.state === 'installed' && !requested) {
        requested = true
        try { worker.postMessage({ type: 'ACTIVATE_WEB_PUSH' }) }
        catch { finish(new Error(WORKER_UPDATE_MESSAGE)) }
      }
    }
    const timer = setTimeout(() => finish(new Error(WORKER_UPDATE_MESSAGE)), 8000)
    worker.addEventListener('statechange', check)
    check()
  })
}

// `ready` may resolve with the legacy worker. Upgrade only after an explicit
// enable action, then verify the active worker can actually handle Web Push.
export async function ensureWebPushWorker(
  registration: ServiceWorkerRegistration,
  probe: (worker: ServiceWorker | null) => Promise<boolean> = supportsWebPush,
) {
  if (await probe(registration.active)) return
  await registration.update()
  const candidate = registration.waiting ?? registration.installing ?? (registration.active?.state === 'activating' ? registration.active : null)
  if (candidate) await activatePushWorker(candidate)
  if (!await probe(registration.active)) throw new Error(WORKER_UPDATE_MESSAGE)
}

interface SubscriptionControls {
  registration: () => Promise<ServiceWorkerRegistration>
  notification: Pick<typeof Notification, 'permission' | 'requestPermission'>
  request: typeof fetch
  ensureWorker?: (registration: ServiceWorkerRegistration) => Promise<void>
}

export async function changeWebPushSubscription(wanted: boolean, controls: SubscriptionControls) {
  const { notification, request } = controls
  // Off is an independent intent: even a subscription removed in another tab
  // must never turn this action into a new opt-in.
  if (!wanted) {
    const registration = await controls.registration()
    const existing = await registration.pushManager.getSubscription()
    if (!existing) return
    const response = await request('/api/push/web/subscription', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: existing.endpoint }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not turn off notifications.')
    await existing.unsubscribe()
    return
  }
  // Keep the browser permission prompt within the explicit user action.
  if (notification.permission === 'default' && await notification.requestPermission() !== 'granted') throw new Error('Notifications are off. You can enable them later in browser settings.')
  if (notification.permission === 'denied') throw new Error('Notifications are blocked. Allow them in your browser’s site settings to continue.')
  const registration = await controls.registration()
  await (controls.ensureWorker ?? ensureWebPushWorker)(registration)
  const configResponse = await request('/api/push/web/subscription', { cache: 'no-store' })
  const config = await configResponse.json()
  if (!configResponse.ok || !config.publicKey) throw new Error('Notifications are not available yet. Please try again later.')
  const raw = atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/'))
  const applicationServerKey = Uint8Array.from(raw, character => character.charCodeAt(0))
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  try {
    const response = await request('/api/push/web/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), consent: true }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not enable notifications.')
  } catch (error) {
    if (!existing) await subscription.unsubscribe()
    throw error
  }
}
