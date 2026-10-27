import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import { prepareInitiationBundleSwitch, type SwitchableInitiationOrder } from './initiation-checkout-switch'

const order: SwitchableInitiationOrder = {
  id: 'order-488', user_id: 'buyer', status: 'pending', order_kind: 'standard', amount: 48800, currency: 'usd',
  stripe_livemode: true, stripe_session_id: 'cs_live_old', stripe_payment_intent: null, paid_at: null,
  pricing_version: 'voyager-bundles-v1', analytics_context: {},
}
const session = (patch: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session => ({
  id: order.stripe_session_id, livemode: true, mode: 'payment', amount_total: 48800, currency: 'usd',
  status: 'open', payment_status: 'unpaid', payment_intent: null,
  metadata: { product_type: 'voyager_initiation', order_id: order.id, user_id: order.user_id, order_kind: 'standard' },
  ...patch,
} as Stripe.Checkout.Session)
const intent = (patch: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent => ({
  id: 'pi_old', status: 'canceled', amount_received: 0, amount: 48800, currency: 'usd', livemode: true,
  metadata: { product_type: 'voyager_initiation', order_id: order.id, order_kind: 'standard' }, ...patch,
} as Stripe.PaymentIntent)
function dependencies() {
  return {
    retrieveSession: vi.fn(async () => session()),
    expireSession: vi.fn(async () => session({ status: 'expired' })),
    retrieveIntent: vi.fn(async () => intent()),
    cancelOrder: vi.fn(async () => true),
  }
}

describe('Initiation bundle switching', () => {
  it('keeps an existing checkout for the selected bundle and leaves new buyers alone', async () => {
    const deps = dependencies()
    expect(await prepareInitiationBundleSwitch(null, 'initial', deps)).toBe(true)
    expect(await prepareInitiationBundleSwitch(order, 'standard', deps)).toBe(true)
    expect(deps.retrieveSession).not.toHaveBeenCalled()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })

  it('expires the $488 checkout before releasing its order for $38', async () => {
    const deps = dependencies()
    expect(await prepareInitiationBundleSwitch(order, 'initial', deps)).toBe(true)
    expect(deps.expireSession).toHaveBeenCalledWith('cs_live_old')
    expect(deps.cancelOrder).toHaveBeenCalledWith(order)
    expect(deps.expireSession.mock.invocationCallOrder[0]).toBeLessThan(deps.cancelOrder.mock.invocationCallOrder[0])
  })

  it('also switches $38 to $488 using the saved quote', async () => {
    const initial: SwitchableInitiationOrder = { ...order, order_kind: 'initial', amount: 3800 }
    const initialSession = session({ amount_total: 3800, metadata: { ...session().metadata, order_kind: 'initial' } })
    const deps = dependencies()
    deps.retrieveSession.mockResolvedValue(initialSession)
    deps.expireSession.mockResolvedValue({ ...initialSession, status: 'expired' })
    expect(await prepareInitiationBundleSwitch(initial, 'standard', deps)).toBe(true)
    expect(deps.cancelOrder).toHaveBeenCalledWith(initial)
  })

  it.each([
    { status: 'payment_review' }, { status: 'paid' }, { status: 'disputed' },
    { paid_at: '2026-10-27T04:00:00Z' }, { stripe_payment_intent: 'pi_old' }, { stripe_session_id: null },
  ])('protects order evidence and ambiguous session creation: %j', async patch => {
    const deps = dependencies()
    expect(await prepareInitiationBundleSwitch({ ...order, ...patch }, 'initial', deps)).toBe(false)
    expect(deps.retrieveSession).not.toHaveBeenCalled()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })

  it.each([
    { status: 'complete' as const }, { payment_status: 'paid' as const }, { id: 'cs_wrong' },
    { livemode: false }, { amount_total: 3800 }, { currency: 'eur' },
    { metadata: { ...session().metadata, user_id: 'another-buyer' } },
    { metadata: { ...session().metadata, order_id: 'another-order' } },
    { metadata: { ...session().metadata, order_kind: 'initial' } },
  ])('protects paid or mismatched Stripe sessions: %j', async patch => {
    const deps = dependencies()
    deps.retrieveSession.mockResolvedValue(session(patch))
    expect(await prepareInitiationBundleSwitch(order, 'initial', deps)).toBe(false)
    expect(deps.expireSession).not.toHaveBeenCalled()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })

  it.each(['retrieveSession', 'expireSession'] as const)('does not release after an ambiguous %s failure', async operation => {
    const deps = dependencies()
    deps[operation].mockRejectedValue(new Error('Stripe timeout or payment won the race'))
    await expect(prepareInitiationBundleSwitch(order, 'initial', deps)).rejects.toThrow()
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })

  it.each([
    { status: 'open' as const }, { status: 'complete' as const }, { payment_status: 'paid' as const },
    { id: 'cs_wrong' }, { metadata: null },
  ])('requires verified expiration before releasing: %j', async patch => {
    const deps = dependencies()
    deps.expireSession.mockResolvedValue(session({ status: 'expired', ...patch }))
    expect(await prepareInitiationBundleSwitch(order, 'initial', deps)).toBe(false)
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })

  it('recovers a previously expired session, including a canceled authorization', async () => {
    const deps = dependencies()
    deps.retrieveSession.mockResolvedValue(session({ status: 'expired', payment_intent: 'pi_old' }))
    expect(await prepareInitiationBundleSwitch(order, 'initial', deps)).toBe(true)
    expect(deps.expireSession).not.toHaveBeenCalled()
    expect(deps.retrieveIntent).toHaveBeenCalledWith('pi_old')
  })

  it.each([
    { status: 'requires_capture' as const }, { status: 'processing' as const }, { status: 'succeeded' as const },
    { amount_received: 48800 }, { id: 'pi_wrong' }, { amount: 3800 }, { livemode: false },
    { metadata: { ...intent().metadata, order_id: 'another-order' } },
  ])('protects any unverified or active authorization: %j', async patch => {
    const deps = dependencies()
    deps.expireSession.mockResolvedValue(session({ status: 'expired', payment_intent: 'pi_old' }))
    deps.retrieveIntent.mockResolvedValue(intent(patch))
    expect(await prepareInitiationBundleSwitch(order, 'initial', deps)).toBe(false)
    expect(deps.cancelOrder).not.toHaveBeenCalled()
  })

  it('stops when the conditional order update loses a race', async () => {
    const deps = dependencies()
    deps.cancelOrder.mockResolvedValue(false)
    expect(await prepareInitiationBundleSwitch(order, 'initial', deps)).toBe(false)
  })
})
