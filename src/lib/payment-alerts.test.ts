import { describe, expect, it, vi } from 'vitest'
import {
  alertDigestKey, cronAlerts, paidNotActivatedAlerts, paymentAlertEmail, reviewOrderAlerts, runPaymentAlertCycle,
  safeAlertText, unalertedAlerts, webhookAlerts, type PaymentAlert, type PaymentAlertDependencies,
} from './payment-alerts'

const now = new Date('2026-10-27T12:00:00.000Z')
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

describe('payment alert selection', () => {
  it('alerts on failed webhooks only, with the error text and minutes since first receipt', () => {
    const alerts = webhookAlerts([
      { event_id: 'evt_1', event_type: 'checkout.session.completed', status: 'failed', attempt_count: 5,
        last_error: '42501: permission denied for sequence voyager_member_no_seq', created_at: ago(2100) },
      { event_id: 'evt_2', event_type: 'charge.succeeded', status: 'processed', attempt_count: 1, last_error: null, created_at: ago(1) },
    ], now)
    expect(alerts).toEqual([{
      key: 'stripe-webhook:evt_1', state: 'failed', kind: 'webhook_failed', subjectId: 'evt_1',
      status: 'failed ×5 (checkout.session.completed)', minutesStuck: 2100,
      error: '42501: permission denied for sequence voyager_member_no_seq',
    }])
  })

  it('alerts on every payment_review order', () => {
    expect(reviewOrderAlerts([{ id: 'o1', status: 'payment_review', created_at: ago(40) }, { id: 'o2', status: 'paid', created_at: ago(40) }], now))
      .toMatchObject([{ key: 'initiation-order:o1', state: 'payment_review', minutesStuck: 40 }])
  })

  it('alerts on a pending order only once its completed Checkout has been stuck for 15 minutes', () => {
    const base = { orderStatus: 'pending', orderCreatedAt: ago(60), sessionStatus: 'complete' }
    const alerts = paidNotActivatedAlerts([
      { ...base, orderId: 'paid-long-ago', paidAt: ago(20) },
      { ...base, orderId: 'paid-just-now', paidAt: ago(14) },
      { ...base, orderId: 'still-open', sessionStatus: 'open', paidAt: null },
      { ...base, orderId: 'expired', sessionStatus: 'expired', paidAt: null },
      { ...base, orderId: 'no-charge', paidAt: null },
      { ...base, orderId: 'already-paid', orderStatus: 'paid', paidAt: ago(30) },
    ], now)
    expect(alerts.map((alert) => [alert.subjectId, alert.minutesStuck])).toEqual([['paid-long-ago', 20], ['no-charge', 60]])
    expect(alerts[0]).toMatchObject({ key: 'initiation-order:paid-long-ago', state: 'pending_checkout_complete', kind: 'order_paid_not_activated' })
  })

  it('alerts on the expiry cron after two consecutive failures, keyed by the streak', () => {
    const row = { job: 'initiation-expiry', last_run_at: ago(1), failing_since: ago(6), consecutive_failures: 2,
      last_error: 'Some Initiation payments still require reconciliation' }
    expect(cronAlerts({ ...row, consecutive_failures: 1, failing_since: ago(1) }, now)).toEqual([])
    expect(cronAlerts(row, now)).toEqual([{
      key: 'cron:initiation-expiry', state: `failing:${row.failing_since}`, kind: 'cron_failing', subjectId: 'initiation-expiry',
      status: 'failed 2 consecutive runs', minutesStuck: 6, error: 'Some Initiation payments still require reconciliation',
    }])
    expect(cronAlerts(null, now)).toEqual([])
  })

  it('alerts when the expiry cron stops recording runs at all', () => {
    const quiet = { job: 'initiation-expiry', last_run_at: ago(25), failing_since: null, consecutive_failures: 0, last_error: null }
    expect(cronAlerts(quiet, now)).toMatchObject([{ kind: 'cron_stale', state: `stale:${quiet.last_run_at}`, minutesStuck: 25 }])
    expect(cronAlerts({ ...quiet, last_run_at: ago(5) }, now)).toEqual([])
  })
})

describe('payment alert de-duplication', () => {
  const alert = (key: string, state: string): PaymentAlert => ({ key, state, kind: 'order_payment_review', subjectId: key, status: state, minutesStuck: 1, error: null })

  it('skips an item already alerted in the same state and re-alerts on a state change', () => {
    const alerts = [alert('initiation-order:a', 'payment_review'), alert('initiation-order:b', 'payment_review'), alert('initiation-order:c', 'pending_checkout_complete')]
    const records = [{ alert_key: 'initiation-order:a', state: 'payment_review' }, { alert_key: 'initiation-order:c', state: 'payment_review' }]
    expect(unalertedAlerts(alerts, records).map((item) => item.key)).toEqual(['initiation-order:b', 'initiation-order:c'])
  })

  it('treats a new cron failure streak as a new state', () => {
    const records = [{ alert_key: 'cron:initiation-expiry', state: 'failing:2026-10-24T10:00:00.000Z' }]
    expect(unalertedAlerts([alert('cron:initiation-expiry', 'failing:2026-10-24T10:00:00.000Z')], records)).toEqual([])
    expect(unalertedAlerts([alert('cron:initiation-expiry', 'failing:2026-10-27T11:00:00.000Z')], records)).toHaveLength(1)
  })

  it('keeps one alert per key when two sources report the same order', () => {
    expect(unalertedAlerts([alert('initiation-order:a', 'payment_review'), alert('initiation-order:a', 'pending_checkout_complete')], []))
      .toEqual([alert('initiation-order:a', 'payment_review')])
  })

  it('derives an order-independent idempotency key from the pending set', () => {
    const a = alert('initiation-order:a', 'payment_review'), b = alert('stripe-webhook:evt', 'failed')
    expect(alertDigestKey([a, b])).toBe(alertDigestKey([b, a]))
    expect(alertDigestKey([a, b])).not.toBe(alertDigestKey([a, { ...b, state: 'other' }]))
  })
})

describe('payment alert content', () => {
  const alert = (key: string, state: string): PaymentAlert => ({ key, state, kind: 'webhook_failed', subjectId: key, status: state, minutesStuck: 1, error: null })

  it('scrubs email addresses and bounds error text', () => {
    expect(safeAlertText('duplicate key for buyer@example.test in\nprofiles')).toBe('duplicate key for [redacted] in profiles')
    expect(safeAlertText('x'.repeat(400))).toHaveLength(300)
    expect(safeAlertText(null)).toBeNull()
  })

  it('contains only ids, status, minutes and error text', () => {
    const email = paymentAlertEmail(paidNotActivatedAlerts([{ orderId: 'order-488', orderStatus: 'pending', orderCreatedAt: ago(90), sessionStatus: 'complete', paidAt: ago(35) }], now))
    expect(email.subject).toBe('[Putopia ops] 1 payment alert')
    expect(email.text).toContain('Initiation paid but not activated: order-488')
    expect(email.text).toContain('minutes stuck: 35')
    expect(email.text).not.toMatch(/@/)
    expect(paymentAlertEmail([{ ...alert('k', 's'), error: '<script>' }]).html).not.toContain('<script>')
  })
})

describe('runPaymentAlertCycle', () => {
  const failed: PaymentAlert = { key: 'stripe-webhook:evt', state: 'failed', kind: 'webhook_failed', subjectId: 'evt', status: 'failed', minutesStuck: 5, error: 'boom' }
  const deps = (overrides: Partial<PaymentAlertDependencies> = {}): PaymentAlertDependencies => ({
    collect: vi.fn(async () => ({ alerts: [failed], errors: [] })),
    loadRecords: vi.fn(async () => []),
    send: vi.fn(async () => ({ error: null })),
    saveRecords: vi.fn(async () => undefined),
    ...overrides,
  })

  it('sends one digest and records it as alerted', async () => {
    const d = deps()
    expect(await runPaymentAlertCycle(d)).toEqual({ detected: 1, sent: 1, errors: [] })
    expect(d.send).toHaveBeenCalledTimes(1)
    expect(d.saveRecords).toHaveBeenCalledWith([{ alert_key: 'stripe-webhook:evt', state: 'failed' }])
  })

  it('sends nothing on the next run for the same state', async () => {
    const d = deps({ loadRecords: vi.fn(async () => [{ alert_key: 'stripe-webhook:evt', state: 'failed' }]) })
    expect(await runPaymentAlertCycle(d)).toEqual({ detected: 1, sent: 0, errors: [] })
    expect(d.send).not.toHaveBeenCalled()
    expect(d.saveRecords).not.toHaveBeenCalled()
  })

  it('does not record an alert the mail provider rejected, so the next run retries it', async () => {
    const d = deps({ send: vi.fn(async () => ({ error: 'Resend 500' })) })
    expect(await runPaymentAlertCycle(d)).toEqual({ detected: 1, sent: 0, errors: ['send: Resend 500'] })
    expect(d.saveRecords).not.toHaveBeenCalled()
  })

  it('does not send when the de-duplication ledger is unavailable', async () => {
    const d = deps({ loadRecords: vi.fn(async () => { throw new Error('relation "ops_alerts" does not exist') }) })
    await expect(runPaymentAlertCycle(d)).rejects.toThrow('ops_alerts')
    expect(d.send).not.toHaveBeenCalled()
  })

  it('reports source errors without skipping the alerts other sources found', async () => {
    const d = deps({ collect: vi.fn(async () => ({ alerts: [failed], errors: ['pending: Stripe timeout'] })) })
    expect(await runPaymentAlertCycle(d)).toEqual({ detected: 1, sent: 1, errors: ['pending: Stripe timeout'] })
  })

  it('skips the ledger and mail entirely when nothing is wrong', async () => {
    const d = deps({ collect: vi.fn(async () => ({ alerts: [], errors: [] })) })
    expect(await runPaymentAlertCycle(d)).toEqual({ detected: 0, sent: 0, errors: [] })
    expect(d.loadRecords).not.toHaveBeenCalled()
  })
})
