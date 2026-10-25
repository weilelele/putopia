// Explicitly target an independent sandbox; never load the application's .env.local.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import Stripe from 'stripe'
import { INITIATION_PRICES, INITIATION_PRICING_VERSION } from '../../src/lib/initiation-pricing.ts'

const args = process.argv.slice(2)
if (!args[0] || args.slice(1).some(arg => arg !== '--apply')) {
  throw new Error('Usage: node scripts/verification/configure-stripe-meta-sandbox.mjs <sandbox-env-file> [--apply]')
}
const file = args[0]
const apply = args.includes('--apply')
let source = await fs.readFile(file, 'utf8')
const env = parseEnv(source)
if (!/^(sk|rk|rkcs)_test_/.test(env.STRIPE_SECRET_KEY ?? '') || !/^acct_/.test(env.STRIPE_SANDBOX_ACCOUNT_ID ?? '')) {
  throw new Error('An explicit sandbox account ID and test key are required')
}
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 })

try {
  const account = await stripe.accounts.retrieve()
  if (account.id !== env.STRIPE_SANDBOX_ACCOUNT_ID) throw new Error('Sandbox account binding does not match')
  const endpoints = []
  for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (endpoint.livemode) throw new Error('Unexpected live webhook')
    endpoints.push({ id: endpoint.id, status: endpoint.status, url: endpoint.url, events: endpoint.enabled_events })
  }
  if (endpoints.some(endpoint => endpoint.status === 'enabled'
    && ['multiverseco.org', 'www.multiverseco.org'].includes(new URL(endpoint.url).hostname))) {
    throw new Error('Sandbox has an enabled webhook pointing to the production website')
  }
  const catalog = {}
  let productId = env.STRIPE_INITIATION_PRODUCT_ID
  if (apply && !productId) {
    const matches = []
    for await (const product of stripe.products.list({ active: true, limit: 100 })) {
      if (product.metadata.product_type === 'voyager_initiation') matches.push(product)
    }
    if (matches.length > 1) throw new Error('Multiple Initiation products need review')
    productId = matches[0]?.id ?? (await stripe.products.create({
      name: 'Voyager Initiation',
      description: 'QA sandbox only. One-time purchase; shipping and applicable taxes included.',
      metadata: { product_type: 'voyager_initiation', environment: 'meta_ads_qa' },
    }, { idempotencyKey: 'meta-ads-qa-initiation-product-v1' })).id
  }
  if (productId) {
    const product = await stripe.products.retrieve(productId)
    if (product.deleted || product.livemode || !product.active || product.metadata.product_type !== 'voyager_initiation') {
      throw new Error('Sandbox product is invalid')
    }
  }
  for (const [kind, offer] of Object.entries(INITIATION_PRICES)) {
    const lookup = `voyager_initiation_${kind}_inclusive_${INITIATION_PRICING_VERSION}`
    let price = env[offer.priceEnv] ? await stripe.prices.retrieve(env[offer.priceEnv]) : null
    if (apply && !price) {
      const existing = await stripe.prices.list({ active: true, lookup_keys: [lookup], limit: 1 })
      price = existing.data[0] ?? await stripe.prices.create({
        product: productId, unit_amount: offer.amount, currency: 'usd', tax_behavior: 'inclusive',
        lookup_key: lookup, metadata: { order_kind: kind, environment: 'meta_ads_qa' },
      }, { idempotencyKey: `meta-ads-qa:${lookup}` })
    }
    if (price && (price.livemode || !price.active || price.type !== 'one_time' || price.unit_amount !== offer.amount
      || price.currency !== 'usd' || price.tax_behavior !== 'inclusive' || price.product !== productId)) {
      throw new Error(`Sandbox price mismatch: ${kind}`)
    }
    catalog[kind] = { id: price?.id ?? null, amount: offer.amount, verified: !!price }
  }
  if (apply) {
    const config = {
      STRIPE_INITIATION_PRODUCT_ID: productId,
      ...Object.fromEntries(Object.entries(INITIATION_PRICES).map(([kind, offer]) => [offer.priceEnv, catalog[kind].id])),
      INITIATION_PRICING_VERSION,
      INITIATION_CHECKOUT_ENABLED: 'false',
      INITIATION_SHIPPING_COUNTRIES: 'US',
      INITIATION_SHIPPING_POLICY: 'included',
      INITIATION_TAX_POLICY: 'included',
    }
    for (const [key, value] of Object.entries(config)) {
      const pattern = new RegExp(`^${key}=.*$`, 'm')
      const line = `${key}=${value}`
      source = pattern.test(source) ? source.replace(pattern, () => line) : `${source.trimEnd()}\n${line}\n`
    }
    await fs.writeFile(file, source, { mode: 0o600 })
    await fs.chmod(file, 0o600)
  }
  console.log(JSON.stringify({
    account: account.id, mode: 'test', apply, productId, pricingVersion: INITIATION_PRICING_VERSION, catalog,
    webhookCount: endpoints.length, enabledWebhookCount: endpoints.filter(endpoint => endpoint.status === 'enabled').length,
    applicationCheckoutEnabled: env.INITIATION_CHECKOUT_ENABLED === 'true' && !apply,
    metaTestEventCodePresent: !!env.META_CAPI_TEST_EVENT_CODE?.trim(),
    databaseIsolation: 'not provisioned by this script',
  }, null, 2))
} catch (error) {
  // Stripe error payloads can contain request details; keep credentials out of logs.
  console.error(JSON.stringify({ error: error.type ? `Stripe ${error.type} (${error.statusCode ?? 'network'})` : error.message }))
  process.exitCode = 1
}
