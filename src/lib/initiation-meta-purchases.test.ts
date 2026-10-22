import type Stripe from 'stripe'
import { describe, expect, it, vi } from 'vitest'
import { buildMetaPurchasePayload } from './meta-capi'
import {
  buildInitiationMetaPurchase, createInitiationMetaStore, deliverInitiationMetaPurchase,
  initiationMetaRetryAt, retryInitiationMetaPurchases, safeInitiationMetaError,
  type InitiationMetaClaim, type InitiationMetaDependencies, type InitiationMetaOrder, type InitiationMetaStore,
} from './initiation-meta-purchases'

const paidAt = '2026-10-13T15:44:55.123Z'
const order: InitiationMetaOrder = {
  id: 'order-520', user_id: 'buyer', status: 'paid', order_kind: 'standard', amount: 52000, currency: 'usd',
  stripe_livemode: true, stripe_session_id: 'cs_live_order520', stripe_payment_intent: 'pi_order520',
  paid_at: paidAt, meta_attribution: {
    event_source_url: 'https://www.multiverseco.org/voyager-initiation',
    fbp: 'fb.1.123.456', fbc: 'fb.1.123.click', client_ip_address: '203.0.113.9', client_user_agent: 'Checkout browser',
  },
}
const claim: InitiationMetaClaim = {
  order_id: order.id, event_id: `initiation_purchase_${order.id}`, event_time: paidAt,
  attempt_count: 1, claim_token: 'lease-1',
}
const session = {
  id: order.stripe_session_id, livemode: true, mode: 'payment', status: 'complete', payment_status: 'paid',
  amount_total: 52000, currency: 'usd', payment_intent: order.stripe_payment_intent,
  metadata: { product_type: 'voyager_initiation', order_id: order.id, user_id: order.user_id, order_kind: 'standard' },
  customer_details: { email: 'purchaser@example.test', phone: '+15555550100', name: 'Checkout Purchaser' },
  collected_information: { shipping_details: { name: 'Shipping Purchaser', address: {
    line1: '123 Test Street', line2: null, city: 'Los Angeles', state: 'CA', postal_code: '90001', country: 'US',
  } } },
} as unknown as Stripe.Checkout.Session

function dependencies(patch: Partial<InitiationMetaOrder> = {}) {
  return {
    store: {
      claim: vi.fn<InitiationMetaStore['claim']>(async () => [claim]),
      loadOrder: vi.fn<InitiationMetaStore['loadOrder']>(async () => ({ ...order, ...patch })),
      finish: vi.fn<InitiationMetaStore['finish']>(async () => true),
    },
    retrieveSession: vi.fn<InitiationMetaDependencies['retrieveSession']>(async () => session),
    sendPurchase: vi.fn<InitiationMetaDependencies['sendPurchase']>(async () => ({ events_received: 1, fbtrace_id: 'trace_123' })),
    now: () => Date.parse('2026-10-13T16:00:00Z'),
  } satisfies InitiationMetaDependencies
}

describe('Initiation paid Purchase payload', () => {
  it('delivers a distinct $38 Initial Pack Purchase with matching cookies and a stable order ID', async () => {
    const deps = dependencies({ order_kind: 'initial', amount: 3800, pricing_version: 'voyager-bundles-v1' })
    deps.retrieveSession.mockResolvedValue({ ...session, amount_total: 3800, metadata: { ...session.metadata, order_kind: 'initial' } })
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('sent')
    const [input, options] = deps.sendPurchase.mock.calls[0]
    expect(options).toEqual({ stripeLiveMode: true })
    expect(buildMetaPurchasePayload(input).data[0]).toMatchObject({
      event_name: 'Purchase', event_id: claim.event_id,
      custom_data: { value: 38, currency: 'USD', content_ids: ['voyager_initiation'], content_name: 'Initial Voyager Pack',
        order_id: order.id, order_kind: 'initial', pricing_version: 'voyager-bundles-v1' },
      user_data: { fbp: order.meta_attribution!.fbp, fbc: order.meta_attribution!.fbc, em: [expect.any(String)] },
    })
    expect(deps.store.finish).toHaveBeenCalledWith(claim, expect.objectContaining({ status: 'sent', meta_trace_id: 'trace_123' }))
  })
  it('rejects $38 without its pricing version or with a crossed bundle', () => {
    const initialSession = { ...session, amount_total: 3800, metadata: { ...session.metadata, order_kind: 'initial' } }
    expect(() => buildInitiationMetaPurchase({ ...order, order_kind: 'initial', amount: 3800 }, claim, initialSession)).toThrow()
    expect(() => buildInitiationMetaPurchase({ ...order, amount: 3800, pricing_version: 'voyager-bundles-v1' }, claim, initialSession)).toThrow()
  })
  it('uses real checkout details and the fixed outbox identity/time for $520', () => {
    expect(buildInitiationMetaPurchase(order, claim, session)).toMatchObject({
      eventId: claim.event_id, eventTime: Math.floor(Date.parse(paidAt) / 1000), value: 520, currency: 'USD',
      contentId: 'voyager_initiation', email: 'purchaser@example.test', firstName: 'Shipping', lastName: 'Purchaser',
      state: 'CA', country: 'US', externalId: 'buyer', fbp: 'fb.1.123.456', fbc: 'fb.1.123.click',
      clientIpAddress: '203.0.113.9', clientUserAgent: 'Checkout browser',
    })
  })
  it('uses the paid upgrade amount of $400 without treating the prior $12 as new revenue', () => {
    const upgrade = { ...order, amount: 40000, order_kind: 'legacy_upgrade' as const }
    const upgradeSession = { ...session, amount_total: 40000, metadata: { ...session.metadata, order_kind: 'legacy_upgrade' } }
    expect(buildInitiationMetaPurchase(upgrade, claim, upgradeSession).value).toBe(400)
  })
  it.each([
    { amount: 1200 }, { currency: 'eur' }, { stripe_livemode: false }, { stripe_session_id: 'cs_other' },
    { stripe_payment_intent: 'pi_other' }, { user_id: 'someone-else' }, { paid_at: '2026-10-13T16:00:00Z' },
  ])('rejects unbound or changed payment facts %j', patch => {
    expect(() => buildInitiationMetaPurchase({ ...order, ...patch }, claim, session)).toThrow()
  })
  it('rejects unpaid Stripe sessions and changed event identities', () => {
    expect(() => buildInitiationMetaPurchase(order, claim, { ...session, payment_status: 'unpaid' })).toThrow()
    expect(() => buildInitiationMetaPurchase(order, { ...claim, event_id: 'synthetic-purchase' }, session)).toThrow()
    expect(() => buildInitiationMetaPurchase(order, { ...claim, event_time: 'invalid' }, session)).toThrow()
  })
})

describe('Initiation persistent Meta delivery', () => {
  it.each(['pending', 'payment_review', 'refunded', 'disputed', 'canceled'])('never sends an order currently %s', async status => {
    const deps = dependencies({ status })
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('skipped')
    expect(deps.retrieveSession).not.toHaveBeenCalled()
    expect(deps.sendPurchase).not.toHaveBeenCalled()
  })
  it.each([{ disabled: true }, { client_user_agent: 'MultiverseCollective/1.0' }])('skips iOS native advertising sharing %j', async meta_attribution => {
    const deps = dependencies({ meta_attribution })
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('skipped')
    expect(deps.sendPurchase).not.toHaveBeenCalled()
  })
  it('rechecks paid status after Stripe retrieval to catch refund/review races', async () => {
    const deps = dependencies()
    deps.store.loadOrder.mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, status: 'payment_review' })
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('skipped')
    expect(deps.sendPurchase).not.toHaveBeenCalled()
  })
  it('marks sent only after Meta acknowledges exactly one event', async () => {
    const deps = dependencies()
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('sent')
    expect(deps.sendPurchase).toHaveBeenCalledWith(expect.objectContaining({ value: 520, eventId: claim.event_id }), { stripeLiveMode: true })
    expect(deps.store.finish).toHaveBeenCalledWith(claim, {
      status: 'sent', sent_at: '2026-10-13T16:00:00.000Z', last_error: null, meta_trace_id: 'trace_123',
      claimed_at: null, claim_token: null,
    })
    deps.sendPurchase.mockResolvedValueOnce({ events_received: 0, fbtrace_id: 'trace' })
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('retried')
  })
  it('retains the same event identity/time after a timeout and safely schedules retry', async () => {
    const deps = dependencies()
    deps.sendPurchase.mockRejectedValueOnce(new Error('secret-token purchaser@example.test'))
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('retried')
    expect(deps.store.finish).toHaveBeenLastCalledWith(claim, expect.objectContaining({
      status: 'pending', next_attempt_at: '2026-10-13T16:01:00.000Z',
      last_error: 'Purchase delivery was not confirmed; retry scheduled',
    }))
    expect(await deliverInitiationMetaPurchase({ ...claim, attempt_count: 2, claim_token: 'lease-2' }, deps)).toBe('sent')
    expect(deps.sendPurchase.mock.calls.map(([payload]) => [payload.eventId, payload.eventTime]))
      .toEqual([[claim.event_id, Math.floor(Date.parse(paidAt) / 1000)], [claim.event_id, Math.floor(Date.parse(paidAt) / 1000)]])
  })
  it('reports a stale lease without overriding a newer delivery', async () => {
    const deps = dependencies()
    deps.store.finish.mockResolvedValue(false)
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('lease_lost')
  })
  it('does not let an unavailable order block the rest of a bounded retry batch', async () => {
    const deps = dependencies()
    deps.store.claim.mockResolvedValue([{ ...claim, order_id: 'bad-order' }, claim])
    deps.store.loadOrder.mockImplementation(async orderId => {
      if (orderId === 'bad-order') throw new Error('Database query failed')
      return order
    })
    expect(await retryInitiationMetaPurchases(deps, { limit: 100 })).toMatchObject({ claimed: 2, sent: 1, retried: 1 })
    expect(deps.store.claim).toHaveBeenCalledWith(null, 5)
  })
  it('leaves an ambiguous database finish recoverable by the processing lease', async () => {
    const deps = dependencies()
    deps.store.finish.mockRejectedValue(new Error('Database unavailable'))
    expect(await deliverInitiationMetaPurchase(claim, deps)).toBe('failed')
  })
})

describe('Initiation Meta storage/error controls', () => {
  it('guards every completion update by order, processing status, and exact claim token', async () => {
    const query = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      abortSignal: vi.fn(async () => ({ data: [{ order_id: order.id }], error: null })),
    }
    const admin = { from: vi.fn(() => query) } as unknown as Parameters<typeof createInitiationMetaStore>[0]
    const store = createInitiationMetaStore(admin)
    expect(await store.finish(claim, { status: 'sent', last_error: null, claimed_at: null, claim_token: null })).toBe(true)
    expect(query.eq.mock.calls).toEqual([['order_id', order.id], ['status', 'processing'], ['claim_token', 'lease-1']])
    expect(query.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal))
  })
  it('uses exponential backoff with a six-hour bound', () => {
    const now = Date.parse('2026-10-13T16:00:00Z')
    expect(initiationMetaRetryAt(1, now)).toBe('2026-10-13T16:01:00.000Z')
    expect(initiationMetaRetryAt(2, now)).toBe('2026-10-13T16:02:00.000Z')
    expect(initiationMetaRetryAt(100, now)).toBe('2026-10-13T22:00:00.000Z')
  })
  it('retains only recognized safe errors and never arbitrary remote data', () => {
    expect(safeInitiationMetaError(new Error('Meta CAPI Purchase request failed with HTTP 401'))).toBe('Meta CAPI HTTP 401')
    expect(safeInitiationMetaError(new Error('Meta CAPI is not configured: META_CAPI_ACCESS_TOKEN is missing'))).toBe('Meta CAPI configuration is missing')
    expect(safeInitiationMetaError(new Error('Meta CAPI test events require a test event code'))).toBe('Meta CAPI test event code is missing')
    expect(safeInitiationMetaError(new Error('https://graph.facebook.com?access_token=secret'))).not.toContain('secret')
  })
})
