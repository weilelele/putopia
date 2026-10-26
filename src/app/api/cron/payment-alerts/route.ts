import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { runPaymentAlerts } from '@/lib/payment-alerts-server'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Previews share production data; only production may write the alert ledger or mail the operator.
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Production only' }, { status: 403 })
  const recipient = process.env.OPS_ALERT_EMAIL?.trim()
  if (!recipient) return NextResponse.json({ error: 'OPS_ALERT_EMAIL is not configured' }, { status: 503 })
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  try {
    const run = await runPaymentAlerts(createAdminClient(), stripe, recipient)
    return NextResponse.json(run, { status: run.errors.length ? 503 : 200 })
  } catch (error) {
    console.error('[payment-alerts] Alert run failed', error)
    return NextResponse.json({ error: 'Payment alert run failed' }, { status: 503 })
  }
}
