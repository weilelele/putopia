/* Multiverse Collective service worker.
 *
 * Two jobs:
 *   1. Installability — Chrome's "Add to Home screen" criteria require a SW with
 *      a fetch handler. We use network-first for navigations with a tiny offline
 *      fallback, and pass everything else straight through (the app loads live
 *      content, so we deliberately do NOT cache dynamic/authed responses).
 *   2. Web Push — receive push payloads and route notification clicks.
 *
 * Versioned cache name so a deploy that changes this file evicts the old shell.
 */

const CACHE = 'mc-shell-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only handle top-level navigations; let everything else hit the network
  // normally (no caching of API/auth responses).
  if (request.mode !== 'navigate') return
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((r) => r || Response.error()),
    ),
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Multiverse Collective', body: event.data && event.data.text() }
  }
  const title = payload.title || 'Multiverse Collective'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/assets/icons/icon-192.webp',
    badge: payload.badge || '/assets/icons/icon-96.webp',
    tag: payload.tag,
    data: { url: payload.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab/window on the same origin if one is open.
      for (const client of clients) {
        try {
          const u = new URL(client.url)
          if (u.origin === self.location.origin && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        } catch {
          // ignore
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
