import { afterEach, describe, expect, it, vi } from 'vitest'
import { changeWebPushSubscription, ensureWebPushWorker } from './web-client'

function controls(existing: PushSubscription | null = null) {
  const created = { endpoint: 'https://fcm.googleapis.com/mock', toJSON: () => ({ endpoint: 'mock' }), unsubscribe: vi.fn().mockResolvedValue(true) } as unknown as PushSubscription
  const getSubscription = vi.fn().mockResolvedValue(existing)
  const subscribe = vi.fn().mockResolvedValue(created)
  const registration = { active: null, waiting: null, installing: null, update: vi.fn(), pushManager: { getSubscription, subscribe } } as unknown as ServiceWorkerRegistration
  const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ publicKey: 'AA' }))
  const notification = { permission: 'granted' as NotificationPermission, requestPermission: vi.fn().mockResolvedValue('granted') }
  const ensureWorker = vi.fn().mockResolvedValue(undefined)
  return { registration: async () => registration, notification, request, ensureWorker, created, subscribe, getSubscription, workerRegistration: registration }
}

afterEach(() => vi.useRealTimers())

describe('explicit Web Push subscription intent', () => {
  it('keeps TURN OFF off when another tab already removed the subscription', async () => {
    const deps = controls()
    deps.notification.permission = 'default'
    await changeWebPushSubscription(false, deps)
    expect(deps.subscribe).not.toHaveBeenCalled()
    expect(deps.request).not.toHaveBeenCalled()
    expect(deps.notification.requestPermission).not.toHaveBeenCalled()
    expect(deps.ensureWorker).not.toHaveBeenCalled()
  })

  it('disables the server record before unsubscribing and preserves it on server failure', async () => {
    const existing = controls().created
    const deps = controls(existing)
    deps.request.mockResolvedValueOnce(Response.json({ error: 'Storage unavailable' }, { status: 503 }))
    await expect(changeWebPushSubscription(false, deps)).rejects.toThrow('Storage unavailable')
    expect(existing.unsubscribe).not.toHaveBeenCalled()
    deps.request.mockResolvedValueOnce(Response.json({ subscribed: false }))
    await changeWebPushSubscription(false, deps)
    expect(deps.request.mock.calls.every(([, init]) => init?.method === 'DELETE')).toBe(true)
    expect(existing.unsubscribe).toHaveBeenCalledOnce()
    expect(deps.subscribe).not.toHaveBeenCalled()
  })

  it('never subscribes or saves consent before the push worker is verified', async () => {
    const deps = controls()
    deps.ensureWorker.mockRejectedValue(new Error('Worker not ready'))
    await expect(changeWebPushSubscription(true, deps)).rejects.toThrow('Worker not ready')
    expect(deps.subscribe).not.toHaveBeenCalled()
    expect(deps.request).not.toHaveBeenCalled()
  })

  it('subscribes only after verification and removes a new subscription if saving fails', async () => {
    const deps = controls()
    deps.subscribe.mockImplementation(async () => {
      expect(deps.ensureWorker).toHaveResolved()
      return deps.created
    })
    deps.request.mockResolvedValueOnce(Response.json({ publicKey: 'AA' })).mockRejectedValueOnce(new Error('Offline'))
    await expect(changeWebPushSubscription(true, deps)).rejects.toThrow('Offline')
    expect(deps.request.mock.calls[1][1]?.method).toBe('POST')
    expect(deps.created.unsubscribe).toHaveBeenCalledOnce()
  })
})

describe('legacy PWA worker upgrade', () => {
  function worker(initial: ServiceWorkerState) {
    const events = new EventTarget()
    const value = Object.assign(events, { state: initial, postMessage: vi.fn() })
    return { value: value as unknown as ServiceWorker, setState(state: ServiceWorkerState) { value.state = state; events.dispatchEvent(new Event('statechange')) } }
  }

  it('activates a waiting push worker and verifies it before enabling', async () => {
    const deps = controls()
    const legacy = worker('activated')
    const next = worker('installed')
    Object.assign(deps.workerRegistration, { active: legacy.value, waiting: next.value })
    next.value.postMessage = vi.fn(() => {
      Object.assign(deps.workerRegistration, { active: next.value, waiting: null })
      next.setState('activated')
    })
    const probe = vi.fn(async (current: ServiceWorker | null) => current === next.value)
    await ensureWebPushWorker(deps.workerRegistration, probe)
    expect(next.value.postMessage).toHaveBeenCalledWith({ type: 'ACTIVATE_WEB_PUSH' })
    expect(probe.mock.calls.map(([current]) => current)).toEqual([legacy.value, next.value])
  })

  it('waits for an installing worker instead of treating legacy ready as push-ready', async () => {
    const deps = controls()
    const next = worker('installing')
    Object.assign(deps.workerRegistration, { installing: next.value })
    next.value.postMessage = vi.fn(() => {
      Object.assign(deps.workerRegistration, { active: next.value, installing: null })
      next.setState('activated')
    })
    const listen = vi.spyOn(next.value, 'addEventListener')
    const ready = ensureWebPushWorker(deps.workerRegistration, async current => current === next.value)
    await vi.waitFor(() => expect(listen).toHaveBeenCalledWith('statechange', expect.any(Function)))
    next.setState('installed')
    await ready
    expect(next.value.postMessage).toHaveBeenCalledOnce()
  })

  it('fails closed if the old worker remains active, or activation never completes', async () => {
    const deps = controls()
    await expect(ensureWebPushWorker(deps.workerRegistration, async () => false)).rejects.toThrow('Close all Console tabs')
    vi.useFakeTimers()
    Object.assign(deps.workerRegistration, { waiting: worker('installed').value })
    const pending = expect(ensureWebPushWorker(deps.workerRegistration, async () => false)).rejects.toThrow('Close all Console tabs')
    await vi.runAllTimersAsync()
    await pending
  })
})
