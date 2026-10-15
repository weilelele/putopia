import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import { retryInitiationAnalytics, sendInitiationPostHog, type InitiationAnalyticsClaim, type InitiationAnalyticsDependencies, type InitiationAnalyticsOrder } from './initiation-analytics-outbox'

const order: InitiationAnalyticsOrder = { id: 'order1', user_id: 'user1', status: 'paid', order_kind: 'standard', amount: 52000, currency: 'usd', stripe_livemode: true,
  stripe_session_id: 'cs_1', stripe_payment_intent: 'pi_1', paid_at: '2026-10-14T00:00:00Z', analytics_context: { environment: 'production', utm_source: 'email', email: 'never-send@example.com' } }
const claim: InitiationAnalyticsClaim = { order_id: 'order1', event: 'initiation_purchase_completed', event_uuid: '00000000-0000-4000-8000-000000000001', event_time: order.paid_at!, claim_token: 'token', attempt_count: 1, reused: false }
const session = { id: 'cs_1', mode: 'payment', livemode: true, status: 'complete', payment_status: 'paid', amount_total: 52000, currency: 'usd', payment_intent: 'pi_1',
  metadata: { product_type: 'voyager_initiation', order_id: 'order1', user_id: 'user1', order_kind: 'standard' } } as unknown as Stripe.Checkout.Session
const intent = { id: 'pi_1', status: 'succeeded', amount: 52000, amount_received: 52000, currency: 'usd', livemode: true,
  metadata: { product_type: 'voyager_initiation', order_id: 'order1', order_kind: 'standard' } } as unknown as Stripe.PaymentIntent
function setup(patch: Partial<InitiationAnalyticsDependencies> = {}) {
  return { claim: vi.fn(async () => [claim]), loadOrder: vi.fn(async () => order), finish: vi.fn(async () => true), retrieveSession: vi.fn(async () => session),
    retrieveIntent: vi.fn(async () => intent), send: vi.fn(async () => {}), now: () => Date.parse('2026-10-14T00:01:00Z'), ...patch }
}
describe('durable PostHog Initiation outcomes', () => {
  it('requires captured payment plus paid database state and emits no customer fields', async () => {
    const deps = setup(); expect(await retryInitiationAnalytics(deps)).toMatchObject({ sent: 1 })
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ uuid: claim.event_uuid, distinct_id: 'user1', timestamp: claim.event_time,
      properties: expect.objectContaining({ payable_amount: 520, payment_status: 'paid', is_test: false }) }))
    expect(JSON.stringify((deps.send as ReturnType<typeof vi.fn>).mock.calls)).not.toContain('never-send')
  })
  it.each(['requires_capture', 'processing', 'canceled'])('authorization-only %s cannot emit Purchase', async status => {
    const deps = setup({ retrieveIntent: async () => ({ ...intent, status, amount_received: 0 }) as Stripe.PaymentIntent })
    expect(await retryInitiationAnalytics(deps)).toMatchObject({ retried: 1 }); expect(deps.send).not.toHaveBeenCalled()
  })
  it('rechecks paid state after reading Stripe to avoid a refund race', async () => {
    let reads = 0
    const deps = setup({ loadOrder: async () => ({ ...order, status: ++reads === 1 ? 'paid' : 'refunded' }) })
    expect(await retryInitiationAnalytics(deps)).toMatchObject({ skipped: 1 }); expect(deps.send).not.toHaveBeenCalled()
  })
  it('retains the same UUID and original timestamp after an ambiguous network result', async () => {
    const deps = setup({ send: vi.fn().mockRejectedValueOnce(new Error('private token')).mockResolvedValueOnce(undefined) })
    expect(await retryInitiationAnalytics(deps)).toMatchObject({ retried: 1 }); expect(await retryInitiationAnalytics(deps)).toMatchObject({ sent: 1 })
    expect(vi.mocked(deps.send).mock.calls[0][0]).toEqual(vi.mocked(deps.send).mock.calls[1][0])
    expect(JSON.stringify(vi.mocked(deps.finish).mock.calls)).not.toContain('private token')
  })
  it('does not let a stale lease mark a newer worker sent', async () => {
    const deps = setup({ finish: async () => false }); expect(await retryInitiationAnalytics(deps)).toMatchObject({ lease_lost: 1 })
  })
  it('labels test mode and unknown environment instead of treating them as production', async () => {
    const deps = setup({ loadOrder: async () => ({ ...order, analytics_context: {} }) })
    await retryInitiationAnalytics(deps); expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ is_test: true }) }))
  })
  it('records reused checkout independently without requiring payment', async () => {
    const deps = setup({ claim: async () => [{ ...claim, event: 'initiation_checkout_started', reused: true }], loadOrder: async () => ({ ...order, status: 'pending' }),
      retrieveSession: async () => ({ ...session, status: 'open', payment_status: 'unpaid' }) })
    expect(await retryInitiationAnalytics(deps)).toMatchObject({ sent: 1 }); expect(deps.retrieveIntent).not.toHaveBeenCalled()
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ reused: true }) }))
  })
  it('retries missing acknowledgement and HTTP failures', async () => {
    for (const response of [new Response('{}'), new Response('{"status":0}'), new Response('{}', { status: 503 })]) {
      await expect(sendInitiationPostHog({ uuid: claim.event_uuid, event: claim.event, distinct_id: 'user1', timestamp: claim.event_time, properties: {} },
        { NEXT_PUBLIC_POSTHOG_KEY: 'test' }, vi.fn(async () => response))).rejects.toThrow('acknowledge')
    }
  })
  it('accepts an explicit ingestion receipt and sends a stable UUID', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{"status":1}'))
    await sendInitiationPostHog({ uuid: claim.event_uuid, event: claim.event, distinct_id: 'user1', timestamp: claim.event_time, properties: {} }, { NEXT_PUBLIC_POSTHOG_KEY: 'test' }, fetcher)
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({ uuid: claim.event_uuid, distinct_id: 'user1' })
  })
})
