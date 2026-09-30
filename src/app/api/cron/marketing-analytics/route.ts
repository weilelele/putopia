import { type NextRequest, NextResponse } from 'next/server'
import { PostHog } from 'posthog-node'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { isCronAuthorized } from '@/lib/cron-auth'
import { analyticsEventId, deliveryCounts, MARKETING_BROADCASTS, verifiedPaidOrder, type AnalyticsOrder } from '@/lib/marketing-analytics'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Read-only reconciliation: does not send email, change orders, or charge cards.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: 'production only' })
  }
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return NextResponse.json({ error: 'analytics not configured' }, { status: 503 })
  const client = new PostHog(key, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
  const checkedAt = new Date()
  const results: Record<string, string | number> = {}
  try {
    try {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) throw new Error('Resend analytics credential unavailable')
      const url = new URL('https://api.resend.com/emails/metrics')
      url.searchParams.set('start_date', '2026-09-01T00:00:00Z')
      url.searchParams.set('dimensions', 'broadcast')
      url.searchParams.set('metrics', 'sent,delivered,bounced,unsubscribed')
      url.searchParams.set('broadcast_id', MARKETING_BROADCASTS.map(b => b.id).join(','))
      const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store', signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error(`Resend metrics HTTP ${response.status}`)
      const payload = await response.json() as { data?: Array<Record<string, unknown>> }
      const snapshots = MARKETING_BROADCASTS.map(broadcast => {
        const row = payload.data?.find(item => item.broadcast_id === broadcast.id)
        if (!row) throw new Error('Incomplete Resend production broadcast response')
        return { broadcast, counts: deliveryCounts(row) }
      })
      // Validate every row first; dashboards select one complete snapshot batch.
      for (const { broadcast, counts } of snapshots) {
        await client.captureImmediate({ distinctId: 'marketing-analytics-system', event: 'resend_broadcast_snapshot', timestamp: checkedAt,
          properties: { $process_person_profile: false, campaign: 'kyoto50_202609', broadcast_id: broadcast.id, utm_content: broadcast.content, snapshot_at: checkedAt.toISOString(), ...counts } })
      }
      await client.captureImmediate({ distinctId: 'marketing-analytics-system', event: 'resend_analytics_synced', timestamp: checkedAt,
        properties: { $process_person_profile: false, snapshot_at: checkedAt.toISOString(), broadcasts: snapshots.length } })
      results.email = 'ok'
    } catch (error) {
      results.email = error instanceof Error && /^Resend metrics HTTP \d{3}$/.test(error.message)
        ? error.message : 'Resend sync failed; no complete snapshot published'
    }

    try {
      const stripe = getStripe()
      if (!stripe) throw new Error('Stripe analytics credential unavailable')
      const admin = createAdminClient()
      let scanned = 0, captured = 0, excluded = 0
      // Fail closed at the capacity limit; never label a truncated backfill complete.
      for (let offset = 0; ; offset += 100) {
        if (offset >= 2000) throw new Error('Order analytics capacity exceeded; checkpointed backfill required')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (admin.from('voyager_orders') as any)
          .select('id,user_id,amount,currency,paid_at,stripe_session_id,device_batch_slug')
          .eq('product_type', 'device_batch_claim').gte('paid_at', '2026-01-01T00:00:00Z')
          .order('id', { ascending: true }).range(offset, offset + 99)
        if (error) throw new Error('Order analytics database read failed')
        const orders = data as AnalyticsOrder[]
        for (const order of orders) {
          scanned++
          // Test-mode orders can share the database with production previews.
          if (!order.stripe_session_id?.startsWith('cs_live_')) { excluded++; continue }
          const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
          if (!verifiedPaidOrder(order, session)) { excluded++; continue }
          await client.captureImmediate({ distinctId: order.user_id!, event: 'device_purchase_completed',
            uuid: analyticsEventId(order.id), timestamp: new Date(order.paid_at),
            properties: { order_id: order.id, amount_minor: order.amount, currency: order.currency.toUpperCase(), device_batch_slug: order.device_batch_slug,
              payment_verified: true, stripe_livemode: true, source: 'server_order_reconciliation' } })
          captured++
        }
        if (orders.length < 100) break
      }
      await client.captureImmediate({ distinctId: 'marketing-analytics-system', event: 'commerce_analytics_synced', timestamp: checkedAt,
        properties: { $process_person_profile: false, scanned_orders: scanned, verified_paid_orders: captured, excluded_orders: excluded, coverage_start: '2026-01-01', complete: true } })
      results.commerce = 'ok'
      results.verified_paid_orders = captured
    } catch {
      // SDK exception messages can contain credentials or customer data.
      results.commerce = 'Commerce sync failed; coverage not confirmed'
    }
    const ok = results.email === 'ok' && results.commerce === 'ok'
    await client.captureImmediate({ distinctId: 'marketing-analytics-system', event: 'marketing_analytics_sync_status', timestamp: checkedAt,
      properties: { $process_person_profile: false, ...results, ok } })
    return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 502 })
  } finally {
    await client.shutdown()
  }
}
