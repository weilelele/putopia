import { it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

it('acknowledges push capability and activates only after an explicit upgrade request', async () => {
  const handlers: Record<string, (event: unknown) => void> = {}
  const skipWaiting = vi.fn().mockResolvedValue(undefined)
  const reply = vi.fn()
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self: { skipWaiting, addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn } } })
  const event = { data: { type: 'WEB_PUSH_CAPABILITIES' }, ports: [{ postMessage: reply }], waitUntil: vi.fn() }
  handlers.message(event)
  expect(reply).toHaveBeenCalledWith({ webPush: 1 })
  expect(skipWaiting).not.toHaveBeenCalled()
  handlers.message({ ...event, data: { type: 'ACTIVATE_WEB_PUSH' } })
  expect(skipWaiting).toHaveBeenCalledOnce()
  await event.waitUntil.mock.calls[0][0]
})

it('handles a push and click, preserving the destination and reporting separate events without any network', async () => {
  const handlers: Record<string, (event: unknown) => void> = {}
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  const fetch = vi.fn().mockResolvedValue({ ok: true })
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, fetch, self: { location: { origin: 'https://www.multiverseco.org' }, addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn }, registration: { showNotification }, clients: { openWindow } } })
  let pending: Promise<void> | undefined
  const token = '12345678-1234-1234-1234-123456789abc'
  handlers.push({ data: { json: () => ({ title: 'Voyager', body: 'An invitation', route: '/voyager-initiation?briefing=1', tag: 'abr-launch', eventToken: token }) }, waitUntil: (promise: Promise<void>) => { pending = promise } })
  await pending
  expect(showNotification).toHaveBeenCalledOnce()
  const options = showNotification.mock.calls[0][1]
  expect(options.data.route).toBe('https://www.multiverseco.org/voyager-initiation?briefing=1')
  expect(JSON.parse(fetch.mock.calls[0][1].body).event).toBe('displayed')
  handlers.notificationclick({ notification: { data: options.data, tag: 'abr-launch', close: vi.fn() }, waitUntil: (promise: Promise<void>) => { pending = promise } })
  await pending
  expect(openWindow.mock.calls[0][0]).toContain('briefing=1&utm_source=web_push&utm_medium=push&utm_campaign=abr-launch')
  expect(JSON.parse(fetch.mock.calls[1][1].body).event).toBe('clicked')
  handlers.push({ data: { json: () => ({ route: 'https://evil.example/' }) }, waitUntil: (promise: Promise<void>) => { pending = promise } })
  await pending
  expect(showNotification.mock.calls[1][1].data.route).toBe('https://www.multiverseco.org/console')
})
