import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../../scripts/shopify/customer-events-pixel.js', import.meta.url), 'utf8')
const reference = `${'a'.repeat(8)}-aaaa-4aaa-8aaa-${'a'.repeat(12)}.${'b'.repeat(64)}`
type Event = { name: string; id: string; timestamp: string; data: Record<string, unknown> }
function setup(responses = [204]) {
  const handlers: Record<string, (event: Event) => Promise<void>> = {}
  const send = vi.fn<(url: string, options: { body: string }) => Promise<{ status: number; ok: boolean }>>(
    async () => ({ status: responses[0], ok: responses[0] < 400 }))
  runInNewContext(source, { analytics: { subscribe: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler } }, fetch: send })
  return { handlers, send }
}
const event = (name: string, ref?: string): Event => ({ name, id: 'evt_1', timestamp: '2026-11-23T19:19:41Z',
  data: { checkout: { attributes: ref ? [{ key: '_putopia_live_reservation', value: ref }] : [] } } })

describe('Shopify Pixel binding boundaries', () => {
  it('reports a missing reference once without inventing a checkout', async () => {
    const { handlers, send } = setup()
    await handlers.checkout_started(event('checkout_started'))
    await handlers.checkout_started(event('checkout_started'))
    expect(send).toHaveBeenCalledTimes(1)
    const body = JSON.parse(send.mock.calls[0][1].body)
    expect(body).toEqual({ event: 'putopia_observation_failed', pixel_version: 3,
      properties: { reason: 'missing_reference', observed_event: 'checkout_started' } })
  })
  it('clears a previous checkout binding and suppresses unbound DOM interactions', async () => {
    const { handlers, send } = setup()
    await handlers.checkout_started(event('checkout_started', reference))
    await handlers.checkout_started(event('checkout_started'))
    await handlers.clicked(event('clicked'))
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.parse(send.mock.calls[1][1].body)).not.toHaveProperty('reference')
  })
  it('reports rejected ingestion without recursively reporting health failures', async () => {
    const { handlers, send } = setup([403])
    await handlers.checkout_completed(event('checkout_completed', reference))
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.parse(send.mock.calls[1][1].body).properties.reason).toBe('ingest_rejected')
  })
  it('reports invalid payload categories without forwarding its invalid identifier', async () => {
    const { handlers, send } = setup()
    await handlers.checkout_started({ ...event('checkout_started', reference), id: 'private@example.com' })
    expect(send).toHaveBeenCalledTimes(1)
    expect(JSON.parse(send.mock.calls[0][1].body).properties.reason).toBe('invalid_payload')
    expect(send.mock.calls[0][1].body).not.toContain('private')
  })
  it('bounds retries when both the original event and health transport fail', async () => {
    const { handlers, send } = setup()
    send.mockRejectedValue(new Error('private network details'))
    await handlers.checkout_completed(event('checkout_completed', reference))
    expect(send).toHaveBeenCalledTimes(3)
    expect(JSON.parse(send.mock.calls[2][1].body).properties.reason).toBe('network_failure')
    expect(send.mock.calls[2][1].body).not.toContain('private')
  })
})
