import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getStripe } from '@/lib/stripe'
import { reconcileInitiationExpiry } from '@/lib/initiation-expiry'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPendingInitiationMetaPurchases } from '@/lib/initiation-meta-purchases'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Production only' }, { status: 403 })
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  // Always retry the outbox even if an unrelated expiry record needs review.
  const [expiry, meta] = await Promise.allSettled([
    Promise.resolve().then(() => reconcileInitiationExpiry(stripe)),
    Promise.resolve().then(() => sendPendingInitiationMetaPurchases(createAdminClient(), stripe)),
  ])
  const failed = expiry.status === 'rejected' || meta.status === 'rejected'
    || (meta.status === 'fulfilled' && (meta.value.failed > 0 || meta.value.retried > 0))
  return NextResponse.json({
    released: expiry.status === 'fulfilled' ? expiry.value : null,
    meta: meta.status === 'fulfilled' ? meta.value : { error: 'Purchase retry is unavailable' },
    ...(failed ? { error: 'Some reconciliation tasks need retry; reservations remain protected.' } : {}),
  }, { status: failed ? 503 : 200 })
}
