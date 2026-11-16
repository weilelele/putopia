import { createClient } from '@supabase/supabase-js'
import { INITIAL_PILOT_QUERY, readPilotOrder } from './initial-pilot-order.mjs'

function setting(name, pattern) {
  const value = process.env[name]
  if (!value || (pattern && !pattern.test(value))) throw new Error(`Set ${name} in the private pilot environment file`)
  return value
}

async function request(url, body, headers) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Shopify request failed (HTTP ${response.status})`)
  const result = await response.json()
  if (result.errors?.length) {
    const codes = result.errors.map(error => error.extensions?.code || 'UNKNOWN').join(', ')
    throw new Error(`Shopify GraphQL rejected the order query (${codes}). Check app permissions, protected customer data and API version`)
  }
  return result
}

async function main() {
  const [orderNumber, ...args] = process.argv.slice(2)
  if (!/^\d+$/.test(orderNumber ?? '') || new Set(args).size !== args.length || args.some(arg => !['--apply', '--complete'].includes(arg))) {
    throw new Error('Usage: node --env-file=<private-file> scripts/shopify/sync-initial-pilot.mjs <numeric-order-id> [--complete] [--apply]')
  }
  const isComplete = args.includes('--complete')
  const dbUrl = setting('SHOPIFY_PILOT_SUPABASE_URL', /^http:\/\/(127\.0\.0\.1|localhost):[0-9]{1,5}\/?$/)
  const admin = createClient(dbUrl, setting('SHOPIFY_PILOT_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const shop = setting('SHOPIFY_PILOT_SHOP', /^[a-z0-9-]+\.myshopify\.com$/)
  const userId = setting('SHOPIFY_PILOT_USER_ID', /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i)
  const { data, error } = await admin.auth.admin.getUserById(userId)
  const user = data?.user
  if (error || !user?.email || !user.email_confirmed_at) throw new Error('Use an existing local Putopia test account with a confirmed email')

  const base = `https://${shop}`
  const token = await request(`${base}/admin/oauth/access_token`, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: setting('SHOPIFY_PILOT_CLIENT_ID'),
    client_secret: setting('SHOPIFY_PILOT_CLIENT_SECRET'),
  }), { 'Content-Type': 'application/x-www-form-urlencoded' })
  if (!token.access_token) throw new Error('Install the same-organization Shopify app with read_orders')
  const orderId = `gid://shopify/Order/${orderNumber}`
  const result = await request(`${base}/admin/api/2026-10/graphql.json`, JSON.stringify({
    query: INITIAL_PILOT_QUERY,
    variables: { id: orderId, isComplete },
  }), { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token.access_token })
  const variantId = process.env[isComplete ? 'SHOPIFY_COMPLETE_PILOT_VARIANT_ID' : 'SHOPIFY_INITIAL_PILOT_VARIANT_ID']
  const snapshot = readPilotOrder(result.data?.order, {
    orderId, email: user.email, kind: isComplete ? 'standard' : 'initial',
    ...(variantId && { bundle: { variantId } }),
  })

  if (!args.includes('--apply')) {
    console.log(JSON.stringify({ result: 'verified_dry_run', refundedPacks: snapshot.refundedPacks, packs: Object.values(snapshot.packs).map(pack => pack.status) }))
    return
  }
  const rpc = isComplete || variantId ? 'sync_shopify_bundle_pilot' : 'sync_shopify_initial_pilot'
  const { data: receipt, error: syncError } = await admin.rpc(rpc, {
    p_shop: shop,
    p_shopify_order: orderId,
    p_user: userId,
    p_paid_at: snapshot.paidAt,
    p_updated_at: snapshot.updatedAt,
    p_refunded_packs: snapshot.refundedPacks,
    p_packs: snapshot.packs,
    ...(rpc === 'sync_shopify_bundle_pilot' && { p_kind: isComplete ? 'standard' : 'initial', p_shipping: snapshot.shipping ?? null }),
  })
  if (syncError) throw new Error(`Local pilot sync rejected: ${syncError.message}`)
  console.log(JSON.stringify(receipt))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
