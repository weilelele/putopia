// Real local Supabase + independent Stripe sandbox + actual application handlers.
// Only the Next cookie adapter and unrelated legacy/email services are replaced.
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import http from 'node:http'
import { parseEnv } from 'node:util'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import ts from 'typescript'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
const base = '/private/tmp/putopia-initiation-sandbox', root = path.resolve(import.meta.dirname, '../..')
const local = parseEnv(await fs.readFile(`${base}/local.env`, 'utf8'))
const credentials = parseEnv(await fs.readFile(`${base}/stripe.env`, 'utf8'))
for (const key of ['API_URL', 'DB_URL']) assert.equal(new URL(local[key]).hostname, '127.0.0.1')
if (!/^(sk|rk|rkcs)_test_/.test(credentials.STRIPE_SECRET_KEY ?? '')) throw Error('Dedicated test key required')
const stripe = new Stripe(credentials.STRIPE_SECRET_KEY)
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
assert.equal(endpoints.has_more, false); assert.equal(endpoints.data.filter(e => e.status === 'enabled').length, 0)
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
assert.equal((await admin.from('putopia_payment_sandbox').select('id').single()).data?.id, 'local-only-fixture-v1')
const { default: pg } = await import(pathToFileURL('/private/tmp/putopia-payment-postgres/node_modules/pg/lib/index.js'))
const db = new pg.Client({ connectionString: local.DB_URL }); await db.connect()
const ledger = await fs.readFile(path.join(root, 'supabase/schema_v61.sql'), 'utf8')
await db.query(ledger.slice(0, ledger.indexOf('create or replace function public.log_device_order_status_change')))
await db.query("notify pgrst,'reload schema'")
await db.end()
const catalog = await stripe.products.list({ limit: 100 })
const product = catalog.data.find(p => p.metadata.verification === 'initiation-isolated') ?? await stripe.products.create({ name: 'Sandbox Voyager Initiation', metadata: { verification: 'initiation-isolated' } })
const prices = await stripe.prices.list({ product: product.id, limit: 20 })
const priceIds = {}
for (const [kind, amount] of [['standard', 52000], ['legacy_upgrade', 40000]]) {
  priceIds[kind] = (prices.data.find(p => p.unit_amount === amount && p.tax_behavior === 'inclusive') ?? await stripe.prices.create({ product: product.id, currency: 'usd', unit_amount: amount, tax_behavior: 'inclusive' })).id
}
const environment = { ...credentials, NEXT_PUBLIC_SITE_URL: 'https://sandbox.example.test', STRIPE_WEBHOOK_SECRET: '',
  STRIPE_INITIATION_PRODUCT_ID: product.id, STRIPE_INITIATION_PRICE_ID: priceIds.standard, STRIPE_INITIATION_UPGRADE_PRICE_ID: priceIds.legacy_upgrade,
  INITIATION_CHECKOUT_ENABLED: 'true', INITIATION_TERMS_APPROVED: 'true', INITIATION_FULFILLMENT_POLICY_APPROVED: 'true',
  INITIATION_SHIPPING_COUNTRIES: 'US', INITIATION_SHIPPING_POLICY: 'included', INITIATION_TAX_POLICY: 'included', INITIATION_TERMS_URL: 'https://sandbox.example.test/terms/initiation' }
let authClient
const forbidden = () => { throw Error('Unexpected legacy or external side effect in sandbox') }
const stubs = {
  'server-only': {}, 'stripe': Stripe,
  'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  '@/lib/supabase/server': { createAdminClient: () => admin, createClient: async () => authClient },
  '@/lib/membership-provisioning': { provisionVoyagerMembership: forbidden }, '@/lib/voyager-path-membership': { activatePaidVoyagerPath: forbidden },
  '@/lib/device-checkout': { isCheckoutAmountValid: forbidden, toStripeMinorUnits: forbidden },
  '@/lib/device-batch-notifications': { sendDeviceOrderStatusNotification: forbidden }, '@/lib/meta-capi': { sendMetaPurchase: forbidden }, '@/lib/app-platform': { isIOSNativeApp: () => false },
}
const allowed = new Set(['src/app/api/initiation-checkout/route.ts', 'src/app/api/stripe/webhook/route.ts', 'src/lib/initiation-webhook.ts',
  'src/lib/initiation-reconciliation.ts', 'src/lib/initiation-expiry.ts', 'src/lib/initiation-capture-policy.ts', 'src/lib/initiation-payment.ts',
  'src/lib/initiation-checkout-policy.ts', 'src/lib/initiation-types.ts', 'src/lib/initiation-config.ts', 'src/lib/stripe.ts', 'src/app/voyager-initiation/navigation.ts'])
const cache = new Map()
async function preload() { for (const file of allowed) cache.set(file, ts.transpileModule(await fs.readFile(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText) }
await preload()
const modules = new Map()
function load(file) {
  if (modules.has(file)) return modules.get(file)
  if (!allowed.has(file)) throw Error(`Unapproved dependency: ${file}`)
  const exports = {}
  const require = name => Object.hasOwn(stubs, name) ? stubs[name] : load(name.startsWith('@/') ? `src/${name.slice(2)}.ts` : path.relative(root, path.resolve(path.dirname(path.join(root, file)), `${name}.ts`)))
  vm.runInNewContext(cache.get(file), { exports, require, process: { env: environment }, URL, Date, console, Response }, { filename: file })
  modules.set(file, exports); return exports
}
const webhook = load('src/app/api/stripe/webhook/route.ts').POST, checkout = load('src/app/api/initiation-checkout/route.ts').POST
const sessions = [], eventLog = []
const server = http.createServer(async (req, res) => {
  try {
    if (req.url !== '/webhook' || req.method !== 'POST') { res.writeHead(404); res.end(); return }
    const chunks = []; for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString('utf8')
    const result = await webhook(new Request('http://127.0.0.1:4343/webhook', { method: 'POST', headers: req.headers, body }))
    const event = JSON.parse(body)
    eventLog.push({ id: event.id, type: event.type, status: result.status })
    await fs.writeFile(`${base}/webhook-results.json`, JSON.stringify(eventLog, null, 2), { mode: 0o600 })
    // Private fixture capture enables deliberate duplicate and signature-failure tests.
    if (req.headers['stripe-signature']) await fs.writeFile(`${base}/last-event.json`, JSON.stringify({ body, signature: req.headers['stripe-signature'] }), { mode: 0o600 })
    res.writeHead(result.status, { 'content-type': 'application/json' }); res.end(await result.text())
  } catch { res.writeHead(500); res.end('{"error":"sandbox handler failed"}') }
})
await new Promise(resolve => server.listen(4343, '127.0.0.1', resolve))
const listener = spawn('stripe', ['listen', '--forward-to', 'http://127.0.0.1:4343/webhook', '--events', 'checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.canceled,charge.refunded,charge.dispute.created'],
  { env: { PATH: process.env.PATH, XDG_CONFIG_HOME: `${base}/config`, STRIPE_API_KEY: credentials.STRIPE_SECRET_KEY } })
let listenerOutput = ''
for (const stream of [listener.stdout, listener.stderr]) stream.on('data', chunk => {
  listenerOutput += chunk.toString(); environment.STRIPE_WEBHOOK_SECRET = listenerOutput.match(/whsec_[A-Za-z0-9]+/)?.[0] ?? ''
})
for (let i = 0; i < 100 && !environment.STRIPE_WEBHOOK_SECRET; i++) await new Promise(resolve => setTimeout(resolve, 100))
assert.ok(environment.STRIPE_WEBHOOK_SECRET, 'Isolated Stripe listener must become ready')
await fs.writeFile(`${base}/webhook.env`, `STRIPE_WEBHOOK_SECRET=${environment.STRIPE_WEBHOOK_SECRET}\n`, { mode: 0o600 })
for (const kind of ['standard', 'legacy_upgrade', 'unsupported']) {
  const email = `fixture-${randomUUID()}@example.test`, password = randomUUID()
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  assert.equal(user.error, null)
  const id = user.data.user.id
  assert.equal((await admin.from('voyager_profiles').insert({ id, role: 'applicant', account_kind: 'human', email })).error, null)
  assert.equal((await admin.from('voyager_intake').insert({ user_id: id, version: 'voyager-profile-v1' })).error, null)
  if (kind === 'legacy_upgrade') assert.equal((await admin.from('voyager_orders').insert({ user_id: id, product_type: 'voyager_pack', status: 'paid', amount: 1200, currency: 'usd', paid_at: new Date().toISOString(), stripe_session_id: `cs_live_fixture_${id}`, stripe_payment_intent: `pi_fixture_${id}` })).error, null)
  authClient = createClient(local.API_URL, local.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  assert.equal((await authClient.auth.signInWithPassword({ email, password })).error, null)
  const result = await checkout(new Request('https://sandbox.example.test/api/initiation-checkout', { method: 'POST', headers: { origin: environment.NEXT_PUBLIC_SITE_URL, 'content-type': 'application/json' }, body: '{}' }))
  const body = await result.json()
  if (result.status !== 200) { console.log(JSON.stringify({ kind, status: result.status, error: body.error })); continue }
  const order = await admin.from('initiation_orders').select('id,stripe_session_id').eq('user_id', id).single()
  sessions.push({ kind, userId: id, orderId: order.data.id, sessionId: order.data.stripe_session_id, url: body.url })
}
await fs.writeFile(`${base}/checkout-sessions.json`, JSON.stringify(sessions, null, 2), { mode: 0o600 })
console.log(JSON.stringify({ ready: true, checkoutSessions: sessions.map(s => s.kind), webhook: 'real Stripe CLI to actual application HTTP handler', auth: 'real local Supabase; cookie adapter replaced', email: 'disabled', productionWrites: 0 }))
await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
listener.kill('SIGTERM'); server.close()
