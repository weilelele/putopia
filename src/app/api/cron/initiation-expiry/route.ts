import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getStripe } from '@/lib/stripe'
import { reconcileInitiationExpiry } from '@/lib/initiation-expiry'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPendingInitiationMetaPurchases } from '@/lib/initiation-meta-purchases'
import { sendPendingInitiationAnalytics } from '@/lib/initiation-analytics-outbox'
import { shopifyLiveConfig } from '@/lib/shopify-live-config'
import { reconcileShopifyLiveQueue } from '@/lib/shopify-live-reconciliation'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Production only' }, { status: 403 })
  const stripe = getStripe()
  const shopifyConfig = shopifyLiveConfig()
  if (!stripe && !shopifyConfig) return NextResponse.json({ error: 'Payments are not configured' }, { status: 503 })
  // Always retry the outbox even if an unrelated expiry record needs review.
  const [expiry, meta, analytics, shopify] = await Promise.allSettled([
    stripe ? Promise.resolve().then(() => reconcileInitiationExpiry(stripe)) : Promise.resolve(null),
    Promise.resolve().then(() => sendPendingInitiationMetaPurchases(createAdminClient(), stripe)),
    Promise.resolve().then(() => sendPendingInitiationAnalytics(createAdminClient(), stripe)),
    shopifyConfig ? (async () => {
      const expired = await createAdminClient().rpc('expire_unbound_initiation_shopify_checkouts' as never)
      if (expired.error) throw expired.error
      return { expired: expired.data, pending: await reconcileShopifyLiveQueue(shopifyConfig) }
    })() : Promise.resolve(null),
  ])
  const failed = (shopify.status === 'fulfilled' && !!shopify.value && shopify.value.pending > 0)
    || expiry.status === 'rejected' || meta.status === 'rejected' || shopify.status === 'rejected'
    || (meta.status === 'fulfilled' && !!meta.value && (meta.value.failed > 0 || meta.value.retried > 0))
    || analytics.status === 'rejected' || (analytics.status === 'fulfilled' && (analytics.value.failed > 0 || analytics.value.retried > 0))
  return NextResponse.json({
    released: expiry.status === 'fulfilled' ? expiry.value : null,
    meta: meta.status === 'fulfilled' ? meta.value : { error: 'Purchase retry is unavailable' },
    analytics: analytics.status === 'fulfilled' ? analytics.value : { error: 'Analytics retry is unavailable' },
    ...(shopifyConfig ? { shopify: shopify.status === 'fulfilled' ? shopify.value : null } : {}),
    ...(failed ? { error: 'Some reconciliation tasks need retry; reservations remain protected.' } : {}),
  }, { status: failed ? 503 : 200 })
}
