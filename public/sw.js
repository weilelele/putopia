const CACHE_NAME = 'multiverse-pwa-v3'
const OFFLINE_URL = '/offline'
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('multiverse-pwa-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    )
  }
})

function notificationRoute(route) {
  try {
    const url = new URL(typeof route === 'string' ? route : '/console', self.location.origin)
    return url.origin === self.location.origin && url.protocol === 'https:' ? url.href : new URL('/console', self.location.origin).href
  } catch { return new URL('/console', self.location.origin).href }
}

self.addEventListener('message', event => {
  if (event.data?.type === 'WEB_PUSH_CAPABILITIES') event.ports[0]?.postMessage({ webPush: 1 })
  // Only an explicit enable action asks a waiting push-capable worker to take over.
  if (event.data?.type === 'ACTIVATE_WEB_PUSH') event.waitUntil(self.skipWaiting())
})

async function recordNotificationEvent(token, event) {
  if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) return
  try {
    await fetch('/api/push/web/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ token, event }) })
  } catch { /* Provider acceptance and UI receipt are reported separately. */ }
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = {}
    try { data = event.data?.json() ?? {} } catch { /* Show a safe fallback. */ }
    await self.registration.showNotification(typeof data.title === 'string' ? data.title.slice(0, 80) : 'Multiverse Collective', {
      body: typeof data.body === 'string' ? data.body.slice(0, 180) : 'A new update is waiting in your Console.',
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: typeof data.tag === 'string' ? data.tag.slice(0, 80) : 'console-update',
      data: { route: notificationRoute(data.route), eventToken: data.eventToken },
    })
    await recordNotificationEvent(data.eventToken, 'displayed')
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const data = event.notification.data ?? {}
    const url = new URL(notificationRoute(data.route))
    url.searchParams.set('utm_source', 'web_push')
    url.searchParams.set('utm_medium', 'push')
    if (event.notification.tag) url.searchParams.set('utm_campaign', event.notification.tag)
    // Open first: analytics must never prevent the click from reaching Console.
    await self.clients.openWindow(url.href)
    await recordNotificationEvent(data.eventToken, 'clicked')
  })())
})
