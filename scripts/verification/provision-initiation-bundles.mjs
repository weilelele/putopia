// Read-only by default. --apply creates ONLY the two new live one-time prices.
// Existing $520/$400 prices, product, checkout flags and customer data are never changed.
import Stripe from 'stripe'
const apply = process.argv.includes('--apply')
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Only --apply is supported')
const key = process.env.STRIPE_SECRET_KEY
if (!key || !/^(sk|rk)_live_/.test(key)) throw new Error('An existing live STRIPE_SECRET_KEY is required')
const stripe = new Stripe(key, { maxNetworkRetries: 1, timeout: 15000 })
async function main() {
  if ((await stripe.accounts.retrieve()).id !== 'acct_1TeNZZA6e1upDxOq') throw new Error('Stripe account mismatch')
  const product = process.env.STRIPE_INITIATION_PRODUCT_ID
  if (!product?.startsWith('prod_')) throw new Error('Existing Initiation product is required')
  for (const [env, amount] of [['STRIPE_INITIATION_PRICE_ID', 52000], ['STRIPE_INITIATION_UPGRADE_PRICE_ID', 40000]]) {
    const id = process.env[env]
    if (!id?.startsWith('price_')) throw new Error('Existing price configuration is required')
    const price = await stripe.prices.retrieve(id)
    if (!price.livemode || !price.active || price.unit_amount !== amount || price.product !== product || price.currency !== 'usd'
      || price.type !== 'one_time' || price.tax_behavior !== 'inclusive') throw new Error('Existing offer validation failed')
  }
  for (const [kind, amount, env] of [['initial', 4800, 'STRIPE_INITIATION_INITIAL_PRICE_ID'], ['initial_upgrade', 50000, 'STRIPE_INITIATION_INITIAL_UPGRADE_PRICE_ID']]) {
    const lookup = `voyager_initiation_${kind}_inclusive_v1`
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 2 })
    if (existing.has_more || existing.data.length > 1) throw new Error('Ambiguous bundle price')
    let price = existing.data[0]
    if (!price && apply) price = await stripe.prices.create({ product, unit_amount: amount, currency: 'usd', tax_behavior: 'inclusive', lookup_key: lookup,
      metadata: { order_kind: kind } }, { idempotencyKey: lookup })
    if (price && (!price.livemode || !price.active || price.unit_amount !== amount || price.product !== product || price.currency !== 'usd'
      || price.type !== 'one_time' || price.tax_behavior !== 'inclusive')) throw new Error('Bundle price validation failed')
    console.log(JSON.stringify({ kind, amount, environmentVariable: env, priceId: price?.id ?? null, state: price ? 'verified' : 'missing; run --apply to create' }))
  }
}
main().catch(error => {
  console.error(error instanceof Stripe.errors.StripeError ? `Stripe request failed (${error.type}, ${error.statusCode ?? 'unknown status'})` : error.message)
  process.exitCode = 1
})
