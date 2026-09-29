import { describe, expect, it } from 'vitest'
import { readDeviceCheckoutResult } from './device-checkout-response'

describe('device checkout response handling', () => {
  it('reads a successful JSON response', async () => {
    const response = Response.json({ url: 'https://checkout.stripe.com/session' }, { status: 201 })
    await expect(readDeviceCheckoutResult(response)).resolves.toEqual({
      url: 'https://checkout.stripe.com/session',
    })
  })

  it('shows a useful message for an HTML error page', async () => {
    const response = new Response('<!DOCTYPE html><title>Bad Gateway</title>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    })
    await expect(readDeviceCheckoutResult(response)).rejects.toThrow(
      'unexpected response (HTTP 502)',
    )
  })

  it('shows a useful message when a server labels invalid JSON as JSON', async () => {
    const response = new Response('<!DOCTYPE html>', {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
    await expect(readDeviceCheckoutResult(response)).rejects.toThrow(
      'unreadable response (HTTP 502)',
    )
  })
})
