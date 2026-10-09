// Read-only metadata audit. Never prints keys, URLs, identities, or Stripe IDs.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import Stripe from 'stripe'
const env = parseEnv(await fs.readFile('.env.local', 'utf8'))
const result = {
  stripeMode: /^(?:sk|rk)_test_/.test(env.STRIPE_SECRET_KEY ?? '') ? 'test' : /^(?:sk|rk)_live_/.test(env.STRIPE_SECRET_KEY ?? '') ? 'live' : 'missing/unknown',
  supabaseIsolation: env.NEXT_PUBLIC_SUPABASE_URL?.includes('oxwfnmcwovxnrvagxzdz') ? 'shared-production' : 'unverified',
  mongoIsolation: 'unverified', webhookSecret: env.STRIPE_WEBHOOK_SECRET ? 'present; mode/endpoint binding unverified' : 'missing',
  localCheckoutEnabled: env.INITIATION_CHECKOUT_ENABLED === 'true',
  localPolicyApproved: env.INITIATION_TERMS_APPROVED === 'true' && env.INITIATION_FULFILLMENT_POLICY_APPROVED === 'true',
}
if (process.argv.includes('--remote-read-only')) {
  // Stripe requests restricted to test-mode metadata GETs.
  if (result.stripeMode === 'test') {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 0 })
    for (const [kind, key, amount] of [['standard', 'STRIPE_INITIATION_PRICE_ID', 52000], ['upgrade', 'STRIPE_INITIATION_UPGRADE_PRICE_ID', 40000]]) {
      try {
        const price = await stripe.prices.retrieve(env[key])
        result[`${kind}PriceVerified`] = !price.livemode && price.active && price.unit_amount === amount && price.currency === 'usd' && price.type === 'one_time' && price.tax_behavior === 'inclusive' && price.product === env.STRIPE_INITIATION_PRODUCT_ID
      } catch { result[`${kind}PriceVerified`] = 'unverified: read failed' }
    }
    try {
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
      const expected = ['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'charge.refunded', 'charge.dispute.created']
      result.testWebhookEndpoint = endpoints.data.some(e => !e.livemode && e.status === 'enabled' && expected.every(type => e.enabled_events.includes('*') || e.enabled_events.includes(type)))
        ? 'enabled endpoint covers events; isolation/signing-secret match still unverified' : 'no enabled endpoint covers required events'
      result.webhookPaginationComplete = !endpoints.has_more
    } catch { result.testWebhookEndpoint = 'unverified: read failed' }
  }
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (env.NEXT_PUBLIC_SUPABASE_URL && key) {
    try {
      const url = new URL('/rest/v1/initiation_batches?select=checkout_open,stripe_livemode,capacity&label=eq.S26', env.NEXT_PUBLIC_SUPABASE_URL)
      const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
      const rows = response.ok ? await response.json() : []
      result.sharedDatabaseBatch = rows.length === 1 ? { checkoutOpen: rows[0].checkout_open, stripeMode: rows[0].stripe_livemode ? 'live' : 'test', capacity: rows[0].capacity } : 'unverified: read unavailable'
    } catch { result.sharedDatabaseBatch = 'unverified: read failed' }
  } else result.sharedDatabaseBatch = 'unverified: admin credential unavailable'
}
console.log(JSON.stringify(result, null, 2))
