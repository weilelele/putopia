import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getStripe } from '@/lib/stripe'
import { reconcileInitiationExpiry } from '@/lib/initiation-expiry'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Production only' }, { status: 403 })
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  try { return NextResponse.json({ released: await reconcileInitiationExpiry(stripe) }) }
  catch { return NextResponse.json({ error: 'Inventory reconciliation failed; reservations remain protected.' }, { status: 503 }) }
}
