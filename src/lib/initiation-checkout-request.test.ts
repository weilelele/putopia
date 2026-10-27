import { describe, expect, it, vi } from 'vitest'
import { requestInitiationCheckout } from './initiation-checkout-request'
const input = { bundle: 'initial' as const, from: null, analytics: {}, afterSignIn: false }
describe('single checkout request', () => {
  it('makes one request with the selected bundle and sign-in context', async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ url: 'https://checkout.stripe.com/c/pay/session' }))
    expect(await requestInitiationCheckout(input, request)).toEqual({ status: 'ready', url: 'https://checkout.stripe.com/c/pay/session' })
    expect(request).toHaveBeenCalledExactlyOnceWith('/api/initiation-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  })
  it.each([
    { response: Response.json({}, { status: 401 }), status: 'unauthenticated' },
    { response: Response.json({ next: 'refresh' }), status: 'refresh' },
    { response: Response.json({ error: 'Already owned' }, { status: 409 }), status: 'error' },
    { response: Response.json({ next: 'refresh' }, { status: 503 }), status: 'error' },
  ])('handles API result $status without a second request', async ({ response, status }) => {
    const request = vi.fn().mockResolvedValue(response)
    expect((await requestInitiationCheckout(input, request)).status).toBe(status)
    expect(request).toHaveBeenCalledOnce()
  })
  it.each(['http://checkout.stripe.com/x', 'https://other.example/x', 'https://checkout.stripe.com.evil.example/x', 'https://user:pass@checkout.stripe.com/x'])('does not navigate to %s', async url => {
    expect((await requestInitiationCheckout(input, vi.fn().mockResolvedValue(Response.json({ url })))).status).toBe('error')
  })
})
