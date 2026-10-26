/**
 * Operator alerts for payments that were taken but not activated. Pure: no DB,
 * Stripe or mail here; payment-alerts-server.ts supplies the rows and sends.
 * Alert bodies carry ids, statuses, minutes and error text only — never
 * buyer names, emails or addresses.
 */
export const ORDER_STUCK_MINUTES = 15
export const CRON_FAILURE_THRESHOLD = 2
export const CRON_STALE_MINUTES = 20
export const WEBHOOK_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000
export const INITIATION_EXPIRY_JOB = 'initiation-expiry'
const ERROR_TEXT_LIMIT = 300

export type PaymentAlertKind = 'webhook_failed' | 'order_payment_review' | 'order_paid_not_activated' | 'cron_failing' | 'cron_stale'
export interface PaymentAlert {
  /** Stable identity of the thing being watched. */
  key: string
  /** A new state for the same key is a state change and alerts again. */
  state: string
  kind: PaymentAlertKind
  subjectId: string
  status: string
  minutesStuck: number
  error: string | null
}

export interface WebhookEventRow { event_id: string; event_type: string; status: string; attempt_count: number; last_error: string | null; created_at: string }
export interface ReviewOrderRow { id: string; status: string; created_at: string }
export interface PendingSessionEvidence { orderId: string; orderStatus: string; orderCreatedAt: string; sessionStatus: string | null; paidAt: string | null }
export interface CronHealthRow { job: string; last_run_at: string; failing_since: string | null; consecutive_failures: number; last_error: string | null }
export interface AlertRecord { alert_key: string; state: string }

const minutesSince = (iso: string, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000))

/** Error text is forwarded, but anything shaped like an email address is not. */
export function safeAlertText(text: string | null | undefined): string | null {
  if (!text) return null
  const scrubbed = text.replace(/[^\s@<>()"',;:]+@[^\s@<>()"',;:]+/g, '[redacted]').replace(/\s+/g, ' ').trim()
  return scrubbed.length > ERROR_TEXT_LIMIT ? `${scrubbed.slice(0, ERROR_TEXT_LIMIT - 1)}…` : scrubbed
}

export function webhookAlerts(rows: WebhookEventRow[], now: Date): PaymentAlert[] {
  return rows.filter((row) => row.status === 'failed').map((row) => ({
    key: `stripe-webhook:${row.event_id}`, state: 'failed', kind: 'webhook_failed', subjectId: row.event_id,
    status: `failed ×${row.attempt_count} (${row.event_type})`, minutesStuck: minutesSince(row.created_at, now), error: safeAlertText(row.last_error),
  }))
}

export function reviewOrderAlerts(rows: ReviewOrderRow[], now: Date): PaymentAlert[] {
  return rows.filter((row) => row.status === 'payment_review').map((row) => ({
    key: `initiation-order:${row.id}`, state: 'payment_review', kind: 'order_payment_review', subjectId: row.id,
    status: 'payment_review', minutesStuck: minutesSince(row.created_at, now), error: null,
  }))
}

/** Stripe says the Checkout is complete, but the local order is still pending. */
export function paidNotActivatedAlerts(items: PendingSessionEvidence[], now: Date): PaymentAlert[] {
  return items.flatMap((item) => {
    if (item.orderStatus !== 'pending' || item.sessionStatus !== 'complete') return []
    const minutesStuck = minutesSince(item.paidAt ?? item.orderCreatedAt, now)
    if (minutesStuck < ORDER_STUCK_MINUTES) return []
    return [{
      key: `initiation-order:${item.orderId}`, state: 'pending_checkout_complete', kind: 'order_paid_not_activated' as const,
      subjectId: item.orderId, status: 'pending (Stripe Checkout complete)', minutesStuck, error: null,
    }]
  })
}

/** Each failure streak (or silent gap) is one state, so it alerts once until the job recovers. */
export function cronAlerts(row: CronHealthRow | null, now: Date): PaymentAlert[] {
  if (!row) return []
  if (row.consecutive_failures >= CRON_FAILURE_THRESHOLD && row.failing_since) {
    return [{
      key: `cron:${row.job}`, state: `failing:${row.failing_since}`, kind: 'cron_failing', subjectId: row.job,
      status: `failed ${row.consecutive_failures} consecutive runs`, minutesStuck: minutesSince(row.failing_since, now), error: safeAlertText(row.last_error),
    }]
  }
  const silent = minutesSince(row.last_run_at, now)
  if (silent >= CRON_STALE_MINUTES) {
    return [{
      key: `cron:${row.job}`, state: `stale:${row.last_run_at}`, kind: 'cron_stale', subjectId: row.job,
      status: 'no recorded run', minutesStuck: silent, error: null,
    }]
  }
  return []
}

/** Only alerts whose key is new, or whose state differs from the last alerted state. */
export function unalertedAlerts(alerts: PaymentAlert[], records: AlertRecord[]): PaymentAlert[] {
  const alerted = new Map(records.map((record) => [record.alert_key, record.state]))
  const seen = new Set<string>()
  return alerts.filter((alert) => {
    if (seen.has(alert.key)) return false
    seen.add(alert.key)
    return alerted.get(alert.key) !== alert.state
  })
}

const KIND_LABEL: Record<PaymentAlertKind, string> = {
  webhook_failed: 'Stripe webhook failed',
  order_payment_review: 'Initiation order in payment_review',
  order_paid_not_activated: 'Initiation paid but not activated',
  cron_failing: 'Cron job failing',
  cron_stale: 'Cron job not running',
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export function paymentAlertEmail(alerts: PaymentAlert[]) {
  const lines = alerts.map((alert) => [
    `${KIND_LABEL[alert.kind]}: ${alert.subjectId}`,
    `  status: ${alert.status}`,
    `  minutes stuck: ${alert.minutesStuck}`,
    ...(alert.error ? [`  error: ${alert.error}`] : []),
  ].join('\n'))
  const text = `${alerts.length} payment alert${alerts.length === 1 ? '' : 's'} need attention.\n\n${lines.join('\n\n')}\n\nEach item is sent once per state change.`
  return {
    subject: `[Putopia ops] ${alerts.length} payment alert${alerts.length === 1 ? '' : 's'}`,
    text,
    html: `<pre style="font-family:monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
  }
}

/** Same pending set → same key, so a retry after a lost acknowledgement is not delivered twice. */
export function alertDigestKey(alerts: PaymentAlert[]): string {
  const material = alerts.map((alert) => `${alert.key}=${alert.state}`).sort().join('|')
  let hash = 0x811c9dc5
  for (let index = 0; index < material.length; index++) hash = Math.imul(hash ^ material.charCodeAt(index), 0x01000193) >>> 0
  return `payment-alerts/${hash.toString(16).padStart(8, '0')}/${alerts.length}`
}

export interface PaymentAlertDependencies {
  collect(): Promise<{ alerts: PaymentAlert[]; errors: string[] }>
  loadRecords(keys: string[]): Promise<AlertRecord[]>
  send(email: ReturnType<typeof paymentAlertEmail>, idempotencyKey: string): Promise<{ error: string | null }>
  saveRecords(records: AlertRecord[]): Promise<void>
}

export interface PaymentAlertRun { detected: number; sent: number; errors: string[] }

/** Records an alert as delivered only after the mail provider accepted it. */
export async function runPaymentAlertCycle(deps: PaymentAlertDependencies): Promise<PaymentAlertRun> {
  const { alerts, errors } = await deps.collect()
  if (!alerts.length) return { detected: 0, sent: 0, errors }
  const pending = unalertedAlerts(alerts, await deps.loadRecords([...new Set(alerts.map((alert) => alert.key))]))
  if (!pending.length) return { detected: alerts.length, sent: 0, errors }
  const delivery = await deps.send(paymentAlertEmail(pending), alertDigestKey(pending))
  if (delivery.error) return { detected: alerts.length, sent: 0, errors: [...errors, `send: ${delivery.error}`] }
  await deps.saveRecords(pending.map((alert) => ({ alert_key: alert.key, state: alert.state })))
  return { detected: alerts.length, sent: pending.length, errors }
}
