import 'server-only'
import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import {
  INITIATION_EXPIRY_JOB, ORDER_STUCK_MINUTES, WEBHOOK_LOOKBACK_MS,
  cronAlerts, paidNotActivatedAlerts, reviewOrderAlerts, runPaymentAlertCycle, webhookAlerts,
  type AlertRecord, type CronHealthRow, type PaymentAlert, type PendingSessionEvidence, type ReviewOrderRow, type WebhookEventRow,
} from '@/lib/payment-alerts'

type Admin = ReturnType<typeof createAdminClient>
const errorText = (error: unknown) => error instanceof Error ? error.message
  : error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : 'unknown error'

/** Read-only: Supabase selects and Stripe retrieves. One failing source must not hide the others. */
async function collectPaymentAlerts(admin: Admin, stripe: Stripe, now: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const alerts: PaymentAlert[] = [], errors: string[] = []
  const source = async (name: string, read: () => Promise<PaymentAlert[]>) => {
    try { alerts.push(...await read()) } catch (error) { errors.push(`${name}: ${errorText(error)}`) }
  }
  await Promise.all([
    source('webhooks', async () => {
      const { data, error } = await db.from('stripe_webhook_events').select('event_id,event_type,status,attempt_count,last_error,created_at')
        .eq('status', 'failed').gte('updated_at', new Date(now.getTime() - WEBHOOK_LOOKBACK_MS).toISOString())
        .order('updated_at', { ascending: false }).limit(50)
      if (error) throw error
      return webhookAlerts(data as WebhookEventRow[], now)
    }),
    source('payment_review', async () => {
      const { data, error } = await db.from('initiation_orders').select('id,status,created_at')
        .eq('status', 'payment_review').order('created_at', { ascending: true }).limit(50)
      if (error) throw error
      return reviewOrderAlerts(data as ReviewOrderRow[], now)
    }),
    source('pending', async () => {
      const { data, error } = await db.from('initiation_orders').select('id,status,created_at,stripe_session_id')
        .eq('status', 'pending').not('stripe_session_id', 'is', null)
        .lt('created_at', new Date(now.getTime() - ORDER_STUCK_MINUTES * 60_000).toISOString())
        .order('created_at', { ascending: true }).limit(25)
      if (error) throw error
      const evidence: PendingSessionEvidence[] = []
      for (const order of data as { id: string; status: string; created_at: string; stripe_session_id: string }[]) {
        try {
          const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, { expand: ['payment_intent.latest_charge'] })
          const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null
          const charge = intent && typeof intent.latest_charge === 'object' ? intent.latest_charge : null
          evidence.push({
            orderId: order.id, orderStatus: order.status, orderCreatedAt: order.created_at, sessionStatus: session.status,
            paidAt: charge ? new Date(charge.created * 1000).toISOString() : null,
          })
        } catch (retrieveError) { errors.push(`stripe ${order.id}: ${errorText(retrieveError)}`) }
      }
      return paidNotActivatedAlerts(evidence, now)
    }),
    source('cron', async () => {
      const { data, error } = await db.from('ops_cron_health').select('job,last_run_at,failing_since,consecutive_failures,last_error')
        .eq('job', INITIATION_EXPIRY_JOB).maybeSingle()
      if (error) throw error
      return cronAlerts(data as CronHealthRow | null, now)
    }),
  ])
  return { alerts, errors }
}

export function runPaymentAlerts(admin: Admin, stripe: Stripe, recipient: string, now = new Date()) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  return runPaymentAlertCycle({
    collect: () => collectPaymentAlerts(admin, stripe, now),
    loadRecords: async (keys) => {
      const { data, error } = await db.from('ops_alerts').select('alert_key,state').in('alert_key', keys)
      if (error) throw error // Without the dedupe ledger every run would re-send.
      return data as AlertRecord[]
    },
    send: (email, idempotencyKey) => sendEmail({ to: recipient, ...email, idempotencyKey, timeoutMs: 10_000 }),
    saveRecords: async (records) => {
      const alertedAt = now.toISOString()
      const { error } = await db.from('ops_alerts').upsert(records.map((record) => ({ ...record, alerted_at: alertedAt })), { onConflict: 'alert_key' })
      if (error) throw error
    },
  })
}

/** Health bookkeeping must never change the outcome of the job it observes. */
export async function recordCronRun(admin: Admin, job: string, failure: string | null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).rpc('record_ops_cron_run', { p_job: job, p_error: failure })
    if (error) throw error
  } catch (error) {
    console.warn('[payment-alerts] Could not record cron health', job, errorText(error))
  }
}
