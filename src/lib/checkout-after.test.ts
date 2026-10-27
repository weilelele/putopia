import { afterEach, describe, expect, it, vi } from 'vitest'
const { callbacks } = vi.hoisted(() => ({ callbacks: [] as (() => Promise<void>)[] }))
vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: (callback: () => Promise<void>) => callbacks.push(callback) }))
import { afterCheckout } from './checkout-after'

afterEach(() => { callbacks.length = 0; vi.restoreAllMocks() })
describe('checkout work after the response', () => {
  it('returns while delivery is still pending, then completes delivery in Next after', async () => {
    let finish!: () => void
    const pending = new Promise<void>(resolve => { finish = resolve })
    const deliver = vi.fn(() => pending)
    expect(afterCheckout(deliver, 'retry later')).toBeUndefined()
    expect(deliver).not.toHaveBeenCalled()
    const running = callbacks[0]()
    expect(deliver).toHaveBeenCalledOnce()
    finish()
    await running
  })
  it('contains delivery failures and logs only the fixed message', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    afterCheckout(async () => { throw new Error('private provider payload') }, 'Delivery deferred')
    await expect(callbacks[0]()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledExactlyOnceWith('Delivery deferred')
  })
})
