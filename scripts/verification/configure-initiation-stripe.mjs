// Explicit opt-in provisioning. Creates no customers, sessions, charges, or subscriptions.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import Stripe from 'stripe'
const env = parseEnv(await fs.readFile('.env.local', 'utf8'))
if (process.argv[2] !== '--test' || !env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Requires --test and a test-mode key')
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 15000 })
const products = await stripe.products.list({ limit: 100, active: true })
let product = products.data.find(p => p.metadata.product_type === 'voyager_initiation')
if (!product) product = await stripe.products.create({ name: 'Voyager Initiation', description: 'One-time Initiation into the Multiverse Collective. Shipping and applicable taxes included.', metadata: { product_type: 'voyager_initiation' } }, { idempotencyKey: 'initiation-product-v1' })
const prices = {}
for (const [kind, amount] of [['standard', 52000], ['legacy_upgrade', 40000]]) {
 const key = `voyager_initiation_${kind}_inclusive_v1`
 const existing = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 })
 const price = existing.data[0] ?? await stripe.prices.create({ product: product.id, unit_amount: amount, currency: 'usd', tax_behavior: 'inclusive', lookup_key: key, metadata: { order_kind: kind } }, { idempotencyKey: key })
 if (price.product !== product.id || price.unit_amount !== amount || price.livemode || price.tax_behavior !== 'inclusive') throw new Error('Existing price does not match the offer')
 prices[kind] = price.id
}
const config = { STRIPE_INITIATION_PRODUCT_ID: product.id, STRIPE_INITIATION_PRICE_ID: prices.standard, STRIPE_INITIATION_UPGRADE_PRICE_ID: prices.legacy_upgrade, INITIATION_CHECKOUT_ENABLED: 'false', INITIATION_SHIPPING_COUNTRIES: 'US', INITIATION_SHIPPING_POLICY: 'included', INITIATION_TAX_POLICY: 'included' }
let local = await fs.readFile('.env.local', 'utf8')
for (const [key,value] of Object.entries(config)) {
 const line = `${key}=${value}`
 const pattern = new RegExp(`^${key}=.*$`, 'm')
 local = pattern.test(local) ? local.replace(pattern,line) : `${local.trimEnd()}\n${line}\n`
}
await fs.writeFile('.env.local', local, { mode: 0o600 })
console.log(JSON.stringify({ mode: 'test', product: product.id, prices, checkoutEnabled: false }))
