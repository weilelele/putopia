import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getStripe } from '@/lib/stripe'
import { reconcileInitiationExpiry } from '@/lib/initiation-expiry'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPendingInitiationMetaPurchases } from '@/lib/initiation-meta-purchases'
import { sendPendingInitiationAnalytics } from '@/lib/initiation-analytics-outbox'
import { recordCronRun } from '@/lib/payment-alerts-server'
import { INITIATION_EXPIRY_JOB } from '@/lib/payment-alerts'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Production only' }, { status: 403 })
  const stripe = getStripe()
  if (!stripe) {
    await recordCronRun(createAdminClient(), INITIATION_EXPIRY_JOB, 'Stripe is not configured')
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }
  // Always retry the outbox even if an unrelated expiry record needs review.
  const [expiry, meta, analytics] = await Promise.allSettled([
    Promise.resolve().then(() => reconcileInitiationExpiry(stripe)),
    Promise.resolve().then(() => sendPendingInitiationMetaPurchases(createAdminClient(), stripe)),
    Promise.resolve().then(() => sendPendingInitiationAnalytics(createAdminClient(), stripe)),
  ])
  // Payment-alert cron reads this streak; outbox retries are routine and are not counted.
  await recordCronRun(createAdminClient(), INITIATION_EXPIRY_JOB, expiry.status === 'rejected'
    ? (expiry.reason instanceof Error ? expiry.reason.message : 'Initiation expiry reconciliation failed') : null)
  const failed = expiry.status === 'rejected' || meta.status === 'rejected'
    || (meta.status === 'fulfilled' && (meta.value.failed > 0 || meta.value.retried > 0))
    || analytics.status === 'rejected' || (analytics.status === 'fulfilled' && (analytics.value.failed > 0 || analytics.value.retried > 0))
  return NextResponse.json({
    released: expiry.status === 'fulfilled' ? expiry.value : null,
    meta: meta.status === 'fulfilled' ? meta.value : { error: 'Purchase retry is unavailable' },
    analytics: analytics.status === 'fulfilled' ? analytics.value : { error: 'Analytics retry is unavailable' },
    ...(failed ? { error: 'Some reconciliation tasks need retry; reservations remain protected.' } : {}),
  }, { status: failed ? 503 : 200 })
}
