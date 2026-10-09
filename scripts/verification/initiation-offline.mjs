// Execute real TypeScript handlers with explicit in-memory adapters. No .env,
// real network, database, email, or Stripe API calls. This is NOT Stripe E2E.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import Stripe from 'stripe'

const root = path.resolve(import.meta.dirname, '../..')
let checks = 0
const check = (value, expected) => { assert.deepEqual(value, expected); checks++ }
const rejects = async (fn, pattern) => { await assert.rejects(fn, pattern); checks++ }
const environment = {
  NEXT_PUBLIC_SITE_URL: 'https://sandbox.example.test',
  STRIPE_INITIATION_PRICE_ID: 'price_standard', STRIPE_INITIATION_UPGRADE_PRICE_ID: 'price_upgrade',
  STRIPE_INITIATION_PRODUCT_ID: 'prod_init', INITIATION_SHIPPING_COUNTRIES: 'US',
  INITIATION_TERMS_URL: 'https://sandbox.example.test/terms/initiation',
}
let order, calls, legacy, price, session, expiredOrders, intent
function reset() {
  order = { id: 'order', user_id: 'buyer', order_kind: 'standard', amount: 52000, currency: 'usd',
    stripe_livemode: false, stripe_session_id: null, price_id: 'price_standard', product_id: 'prod_init',
    status: 'pending', expires_at: new Date(Date.now() + 3600000).toISOString() }
  calls = []; legacy = null; expiredOrders = []
  intent = { id: 'pi_offline', status: 'succeeded', capture_method: 'automatic', amount: 52000, amount_received: 52000, amount_capturable: 0, currency: 'usd', livemode: false, metadata: { product_type: 'voyager_initiation', order_kind: 'standard', order_id: 'order' } }
  price = { active: true, type: 'one_time', unit_amount: 52000, currency: 'usd', product: 'prod_init', tax_behavior: 'inclusive', livemode: false }
  session = { id: 'cs_test_offline', status: 'complete', payment_status: 'paid', livemode: false, mode: 'payment',
    amount_total: 52000, currency: 'usd', payment_intent: 'pi_offline', url: 'https://checkout.stripe.com/offline',
    metadata: { product_type: 'voyager_initiation', order_kind: 'standard', order_id: 'order', user_id: 'buyer' },
    collected_information: { shipping_details: { name: 'Offline Fixture', address: { line1: '1 Fixture', country: 'US', state: 'CA' } } } }
}
const admin = {
  from(table) {
    let patch, filters = [], list = false
    const query = {
      select() { return query }, single() { return query }, limit() { return query },
      order() { list = true; return query },
      in(key, values) { filters.push([key, values]); return query },
      eq(key, value) { filters.push([key, value]); return query }, is(key, value) { return query.eq(key, value) },
      lte() { return query }, update(value) { patch = value; return query },
      then(resolve) {
        if (patch) {
          const applies = filters.every(([key, value]) => Array.isArray(value) ? value.includes(order[key]) : order[key] === value)
          calls.push({ update: table, patch, applies })
          if (applies) Object.assign(order, patch)
          return Promise.resolve({ data: applies ? [{ id: order.id }] : [], error: null }).then(resolve)
        }
        return Promise.resolve({ data: table === 'initiation_batches' ? { stripe_livemode: false }
          : table === 'voyager_orders' ? [] : list ? expiredOrders : { ...order }, error: null }).then(resolve)
      },
    }
    return query
  },
  async rpc(name, args) {
    calls.push({ rpc: name, args })
    return { data: name === 'eligible_legacy_initiation_order' ? legacy : name === 'reserve_initiation' ? { ...order } : null, error: null }
  },
}
const stripe = {
  charges: { retrieve: async () => ({ id: 'ch_offline', payment_intent: intent.id, amount: 52000, amount_refunded: 13000, currency: 'usd' }) },
  prices: { retrieve: async () => price },
  paymentIntents: {
    retrieve: async () => intent,
    capture: async (id, params, options) => { calls.push({ capture: id, params, options }); intent.status = 'succeeded'; intent.amount_received = intent.amount; intent.amount_capturable = 0; session.payment_status = 'paid'; return intent },
    cancel: async () => { intent.status = 'canceled'; intent.amount_received = 0; calls.push({ cancel: true }); return intent },
  },
  checkout: { sessions: {
    retrieve: async () => session,
    list: async () => ({ data: [session], has_more: false }),
    create: async (params, options) => { calls.push({ create: params, options }); return session },
    listLineItems: async () => ({ has_more: false, data: [{ price: { id: order.price_id, product: order.product_id }, quantity: 1 }] }),
  } },
}
// Deny every dependency except this allowlist; prevents accidental external I/O.
const stubs = {
  'server-only': {}, 'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
  '@/lib/supabase/server': { createAdminClient: () => admin, createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'buyer', email: 'fixture@example.test' } } }) } }) },
  '@/lib/stripe': { getStripe: () => stripe }, '@/lib/initiation-config': { initiationConfigurationError: () => null },
  'node:crypto': {}, 'next/cache': {}, '@/lib/profile-validation': {}, '@/lib/loops': {},
}
const allowed = new Set(['src/lib/initiation-types.ts', 'src/lib/initiation-checkout-policy.ts', 'src/lib/initiation-payment.ts',
  'src/lib/initiation-reconciliation.ts', 'src/lib/initiation-capture-policy.ts', 'src/lib/actions/profile.ts',
  'src/lib/initiation-webhook.ts', 'src/lib/initiation-expiry.ts', 'src/app/api/initiation-checkout/route.ts', 'src/app/voyager-initiation/navigation.ts'])
function load(relative) {
  if (!allowed.has(relative)) throw new Error(`Unapproved offline module: ${relative}`)
  const filename = path.join(root, relative)
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const loaded = { exports: {} }
  const require = name => {
    if (Object.hasOwn(stubs, name)) return stubs[name]
    const dependency = name.startsWith('@/') ? `src/${name.slice(2)}.ts` : path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`))
    return load(dependency)
  }
  vm.runInNewContext(output, { exports: loaded.exports, require, process: { env: environment }, URL, Date, console: { error() {} } }, { filename })
  return loaded.exports
}
const { POST } = load('src/app/api/initiation-checkout/route.ts')
const { handleInitiationWebhook } = load('src/lib/initiation-webhook.ts')
const { reconcileInitiationExpiry } = load('src/lib/initiation-expiry.ts')
const event = type => ({ type, data: { object: session } })
const request = (origin = environment.NEXT_PUBLIC_SITE_URL) => ({ headers: { get: () => origin }, json: async () => ({ amount: 1, kind: 'legacy_upgrade', user_id: 'attacker', from: 'https://evil.test' }) })
reset()
check((await POST(request('https://evil.test'))).status, 403)
check(calls.length, 0)
check((await POST(request())).status, 200)
let created = calls.find(c => c.create)
check(created.create.line_items[0].price, 'price_standard')
check(created.create.client_reference_id, 'buyer')
check(created.create.shipping_address_collection.allowed_countries.join(','), 'US')
check(created.create.automatic_tax.enabled, false)
check(created.create.allow_promotion_codes, false)
check(created.options.idempotencyKey, 'initiation:order')
check(calls.find(c => c.rpc === 'reserve_initiation').args.p_device_source, null)
session.status = 'open'
check((await POST(request())).status, 200)
check(calls.filter(c => c.create).length, 1)
reset(); legacy = 'old_paid_pack'; order.order_kind = 'legacy_upgrade'; order.amount = price.unit_amount = 40000; order.price_id = 'price_upgrade'
check((await POST(request())).status, 200)
check(calls.find(c => c.create).create.line_items[0].price, 'price_upgrade')
reset(); price.livemode = true
check((await POST(request())).status, 503)
check(calls.some(c => c.rpc === 'reserve_initiation'), false)
reset(); session.payment_status = 'unpaid'
await handleInitiationWebhook(event('checkout.session.completed'), stripe)
check(calls.length, 0)
session.payment_status = 'paid'
await handleInitiationWebhook(event('checkout.session.completed'), stripe)
check(calls.filter(c => c.rpc === 'complete_initiation').length, 1)
reset(); session.amount_total = 1
await rejects(() => handleInitiationWebhook(event('checkout.session.completed'), stripe), /requires reconciliation/)
check(order.status, 'payment_review')
check(calls.some(c => c.rpc === 'complete_initiation'), false)
reset(); session.collected_information.shipping_details.address.state = 'AK'
await rejects(() => handleInitiationWebhook(event('checkout.session.completed'), stripe), /outside the contiguous/)
check(order.status, 'payment_review')
check(calls.some(c => c.rpc === 'complete_initiation'), false)
reset(); session.metadata.user_id = 'attacker'
await rejects(() => handleInitiationWebhook(event('checkout.session.completed'), stripe), /binding mismatch/)
check(calls.length, 0)
reset(); order.status = 'paid'
await handleInitiationWebhook(event('checkout.session.expired'), stripe)
check(order.status, 'paid')
reset(); session.status = 'expired'; session.payment_status = 'unpaid'; intent.status = 'canceled'; intent.amount_received = 0
await handleInitiationWebhook(event('checkout.session.expired'), stripe)
check(order.status, 'canceled')
reset()
await handleInitiationWebhook(event('checkout.session.async_payment_failed'), stripe)
check(order.status, 'pending') // Current successful Stripe state wins over a stale failure event.
check(calls.some(c => c.rpc === 'complete_initiation'), true)
for (const [type, reason] of [['charge.refunded', 'refunded'], ['charge.dispute.created', 'disputed']]) {
  reset(); await handleInitiationWebhook(event(type), stripe)
  if (type === 'charge.refunded') check(JSON.parse(JSON.stringify(calls.find(c => c.rpc === 'record_initiation_refund').args)), { p_intent: intent.id, p_amount: 52000, p_refunded: 13000 })
  else check(calls.find(c => c.rpc === 'hold_initiation_payment').args.p_reason, reason)
}
reset(); expiredOrders = [{ id: order.id, user_id: order.user_id, stripe_session_id: null }]
check(await reconcileInitiationExpiry(stripe), 0)
order.stripe_session_id = session.id; expiredOrders[0].stripe_session_id = session.id
check(await reconcileInitiationExpiry(stripe), 0)
session.status = 'expired'; session.payment_status = 'unpaid'
intent.status = 'canceled'; intent.amount_received = 0
check(await reconcileInitiationExpiry(stripe), 1)
check(order.status, 'canceled')
// Actual reconciliation function: manual authorization captures once, then grants.
reset(); session.payment_status = 'unpaid'; intent.capture_method = 'manual'; intent.status = 'requires_capture'; intent.amount_received = 0; intent.amount_capturable = 52000
await handleInitiationWebhook(event('checkout.session.completed'), stripe)
check(calls.filter(c => c.capture).length, 1)
check(calls.find(c => c.capture).options.idempotencyKey, 'initiation:capture:order')
check(calls.some(c => c.rpc === 'complete_initiation'), true)
await handleInitiationWebhook(event('checkout.session.completed'), stripe)
check(calls.filter(c => c.capture).length, 1)
reset(); session.payment_status = 'unpaid'; intent.capture_method = 'manual'; intent.status = 'requires_capture'; intent.amount_received = 0; intent.amount_capturable = 52000
session.collected_information.shipping_details.address.state = 'AK'
await handleInitiationWebhook(event('checkout.session.completed'), stripe)
check(calls.some(c => c.capture), false)
check(calls.some(c => c.rpc === 'complete_initiation'), false)
check(order.status, 'canceled')
check(intent.amount_received, 0)
// Lost capture response: leave the hold intact, then reconcile success on retry.
reset(); session.payment_status = 'unpaid'; intent.capture_method = 'manual'; intent.status = 'requires_capture'; intent.amount_received = 0; intent.amount_capturable = 52000
const capture = stripe.paymentIntents.capture
stripe.paymentIntents.capture = async (...args) => { await capture(...args); throw new Error('simulated timeout after capture') }
await rejects(() => handleInitiationWebhook(event('checkout.session.completed'), stripe), /simulated timeout/)
check(order.status, 'pending')
check(calls.some(c => c.rpc === 'complete_initiation'), false)
stripe.paymentIntents.capture = capture
await handleInitiationWebhook(event('checkout.session.completed'), stripe)
check(calls.filter(c => c.capture).length, 1)
check(calls.some(c => c.rpc === 'complete_initiation'), true)
// The profile milestone must use the authoritative bound predicate, including revocation.
const { getMyProfileStages } = load('src/lib/actions/profile.ts')
const originalRpc = admin.rpc
for (const bound of [true, false]) {
  admin.rpc = async (name, args) => {
    check(name, 'has_bound_console'); check(args.p_user, 'buyer')
    return { data: bound, error: null }
  }
  check((await getMyProfileStages()).consoleBound, bound)
}
admin.rpc = async () => ({ data: null, error: { code: 'unavailable' } })
await rejects(() => getMyProfileStages(), /binding status/)
admin.rpc = async () => ({ data: 'true', error: null })
await rejects(() => getMyProfileStages(), /binding status/)
admin.rpc = originalRpc
// Installed Stripe SDK verifies locally generated HMAC signatures, with no API client request.
const sdk = new Stripe('sk_test_offline_fixture')
const payload = JSON.stringify({ id: 'evt_offline', object: 'event', type: 'checkout.session.completed' })
const secret = 'whsec_offline_fixture'
const signature = sdk.webhooks.generateTestHeaderString({ payload, secret })
check(sdk.webhooks.constructEvent(payload, signature, secret).id, 'evt_offline')
for (const [body, header, key] of [[payload + ' ', signature, secret], [payload, signature, 'wrong'], [payload, '', secret],
  [payload, sdk.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1 }), secret]]) {
  assert.throws(() => sdk.webhooks.constructEvent(body, header, key)); checks++
}
console.log(`PASS: ${checks} offline handler/SDK assertions. Adapters are simulated; no Stripe E2E or database concurrency claim.`)
