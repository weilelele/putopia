import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMetaPurchasePayload, sendMetaPurchase, type MetaPurchaseInput } from './meta-capi'

const purchase: MetaPurchaseInput = {
  eventId: 'device_purchase_order-123',
  eventTime: 1_790_000_000,
  value: 520,
  currency: 'usd',
  contentId: 'kyoto-one',
  eventSourceUrl: 'https://multiverseco.org/devices/claim/success',
  email: ' Voyager@Example.com ',
  phone: '+1 (415) 555-0100',
  firstName: 'Ada',
  lastName: 'Lovelace',
  externalId: 'user-123',
  clientIpAddress: '203.0.113.5',
  clientUserAgent: 'Example browser',
  fbp: 'fb.1.123.456',
  fbc: 'fb.1.123.click-id',
}

afterEach(() => vi.unstubAllEnvs())

describe('Meta CAPI Purchase', () => {
  it('builds the standard server Purchase and hashes matching identifiers', async () => {
    const payload = buildMetaPurchasePayload(purchase)
    const event = payload.data[0]

    expect(event).toMatchObject({
      event_name: 'Purchase',
      event_time: purchase.eventTime,
      event_id: purchase.eventId,
      action_source: 'website',
      event_source_url: purchase.eventSourceUrl,
      custom_data: {
        value: 520,
        currency: 'USD',
        content_ids: ['kyoto-one'],
        content_type: 'product',
        num_items: 1,
      },
    })
    expect(event.user_data).toMatchObject({
      em: ['3cb2d9a8768e0daa9e2b7f141850ef6333012a84bd1519e35f3819648ebdb5e7'],
      ph: [expect.any(String)],
      external_id: [expect.any(String)],
      client_ip_address: '203.0.113.5',
      client_user_agent: 'Example browser',
      fbp: 'fb.1.123.456',
      fbc: 'fb.1.123.click-id',
    })
    expect((event.user_data.em as string[])[0]).not.toContain('Voyager')
    expect(JSON.stringify(event.user_data)).not.toContain('4155550100')
  })

  it('adds Test Events code only for an explicitly configured Stripe test event', async () => {
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'test-token')
    vi.stubEnv('META_CAPI_TEST_EVENT_CODE', 'TEST123')
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toContain('"test_event_code":"TEST123"')
      return new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
    })

    await sendMetaPurchase(purchase, { stripeLiveMode: false, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('never includes Test Events code on a live Stripe event', async () => {
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'test-token')
    vi.stubEnv('META_CAPI_TEST_EVENT_CODE', 'TEST123')
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).not.toContain('test_event_code')
      return new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
    })

    await sendMetaPurchase(purchase, { stripeLiveMode: true, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('fails visibly if Meta CAPI is not configured or rejects the event', async () => {
    await expect(sendMetaPurchase(purchase, { stripeLiveMode: true })).rejects.toThrow(
      'META_CAPI_ACCESS_TOKEN is missing',
    )
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'test-token')
    await expect(sendMetaPurchase(purchase, {
      stripeLiveMode: true,
      fetchImpl: async () => new Response('{}', { status: 400 }),
    })).rejects.toThrow('HTTP 400')
  })
})
