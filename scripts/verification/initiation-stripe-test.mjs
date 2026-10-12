// Real Stripe TEST API feasibility probe; does not change the application flow.
// No live keys, real cards, customers, receipt emails, or production DB access.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
import Stripe from 'stripe'
process.on('uncaughtException', error => {
  console.error(JSON.stringify({ status: 'blocked-or-failed', type: error.name, code: error.code ?? null,
    reason: String(error.message).replace(/\b[a-z]+_(?:test|live)_[A-Za-z0-9_]+|whsec_[A-Za-z0-9_]+/g, '[redacted]') }))
  process.exitCode = 1
})
assert.equal(process.argv[2], '--test', 'Explicit --test required')
// A dedicated file keeps this probe independent of concurrently edited app .env.
const env = parseEnv(await fs.readFile(process.argv[3] ?? '/private/tmp/putopia-initiation-sandbox/stripe.env', 'utf8'))
if (!/^(sk|rk|rkcs)_test_/.test(env.STRIPE_SECRET_KEY ?? '')) throw new Error('Test key required')
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 })
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
assert.equal(endpoints.has_more, false, 'Must inspect every endpoint before emitting events')
assert.equal(endpoints.data.filter(e => e.status === 'enabled').length, 0,
  'Enabled account test webhooks may write shared production; use a separate Stripe sandbox or isolate endpoints first')
const loaded = { exports: {} }
vm.runInNewContext(ts.transpileModule(await fs.readFile(new URL('../../src/lib/initiation-checkout-policy.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: loaded.exports, URL })
const region = loaded.exports.isInitiationShippingRegion
const run = randomUUID(), tracked = [], results = []
let checkout
try {
  // Confirm hosted Checkout accepts this capture mode, without paying the session.
  checkout = await stripe.checkout.sessions.create({ mode: 'payment', ui_mode: 'hosted_page', payment_method_types: ['card'],
    line_items: [{ price_data: { currency: 'usd', unit_amount: 52000, tax_behavior: 'inclusive', product_data: { name: 'Sandbox Initiation feasibility fixture' } }, quantity: 1 }],
    payment_intent_data: { capture_method: 'manual', metadata: { verification: run, product_type: 'sandbox_capture_probe' } },
    metadata: { verification: run, product_type: 'sandbox_capture_probe' },
    shipping_address_collection: { allowed_countries: ['US'] },
    success_url: 'https://example.test/sandbox/success', cancel_url: 'https://example.test/sandbox/cancel',
  }, { idempotencyKey: `sandbox:${run}:checkout` })
  assert.equal(checkout.livemode, false)
  assert.equal(checkout.amount_total, 52000)
  assert.equal(checkout.ui_mode, 'hosted_page')
  assert.ok(checkout.url?.startsWith('https://checkout.stripe.com/'))
  results.push({ scenario: 'hosted manual-capture session creation', status: 'pass', browserCompletion: 'not tested' })
  for (const [state, amount] of [['CA', 52000], ['DC', 40000], ['AK', 52000], ['HI', 52000]]) {
    const intent = await stripe.paymentIntents.create({ amount, currency: 'usd', capture_method: 'manual',
      payment_method_types: ['card'], payment_method: 'pm_card_visa', confirm: true,
      metadata: { verification: run, product_type: 'sandbox_capture_probe' },
      shipping: { name: 'Sandbox Fixture', address: { line1: '1 Fixture Street', city: 'Fixture', state, country: 'US', postal_code: '00000' } },
    }, { idempotencyKey: `sandbox:${run}:${state}` })
    tracked.push(intent.id)
    assert.equal(intent.livemode, false)
    assert.equal(intent.status, 'requires_capture')
    assert.equal(intent.amount_received, 0)
    const allowed = region(intent.shipping.address)
    if (allowed) {
      const options = { idempotencyKey: `sandbox:${run}:capture:${state}` }
      const captured = await stripe.paymentIntents.capture(intent.id, { amount_to_capture: amount }, options)
      assert.equal(captured.status, 'succeeded'); assert.equal(captured.amount_received, amount)
      const repeated = await stripe.paymentIntents.capture(intent.id, { amount_to_capture: amount }, options)
      assert.equal(repeated.id, captured.id); assert.equal(repeated.amount_received, amount)
      const refund = await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `sandbox:${run}:refund:${state}` })
      assert.equal(refund.status, 'succeeded')
      results.push({ scenario: `${state} ${amount / 100} USD`, status: 'pass', captured: true, duplicateCaptureIdempotent: true, testRefund: 'succeeded' })
    } else {
      const canceled = await stripe.paymentIntents.cancel(intent.id)
      assert.equal(canceled.status, 'canceled'); assert.equal(canceled.amount_received, 0)
      results.push({ scenario: `${state} unsupported`, status: 'pass', captured: false, authorization: 'canceled' })
    }
  }
  let declined = false
  try {
    const intent = await stripe.paymentIntents.create({ amount: 52000, currency: 'usd', capture_method: 'manual',
      payment_method_types: ['card'], payment_method: 'pm_card_chargeDeclined', confirm: true,
      metadata: { verification: run, product_type: 'sandbox_capture_probe' },
    }, { idempotencyKey: `sandbox:${run}:decline` })
    tracked.push(intent.id)
  } catch (error) {
    if (error.payment_intent?.id) tracked.push(error.payment_intent.id)
    declined = error.code === 'card_declined'
    if (!declined) throw new Error(`Stripe declined test failed: ${error.code ?? 'unknown'}`)
  }
  assert.equal(declined, true)
  results.push({ scenario: 'card decline', status: 'pass' })
} finally {
  if (checkout) await stripe.checkout.sessions.expire(checkout.id)
  for (const id of tracked) {
    const current = await stripe.paymentIntents.retrieve(id)
    assert.equal(current.livemode, false)
    if (!['succeeded', 'canceled'].includes(current.status)) await stripe.paymentIntents.cancel(id)
    if (current.status === 'succeeded') {
      const refunds = await stripe.refunds.list({ payment_intent: id, limit: 10 })
      if (!refunds.data.some(r => r.status === 'succeeded' && r.amount === current.amount)) await stripe.refunds.create({ payment_intent: id }, { idempotencyKey: `sandbox:${run}:cleanup:${id}` })
    }
  }
  await fs.writeFile('/private/tmp/putopia-initiation-sandbox/stripe-probe-resources.json', JSON.stringify({ run, checkout: checkout?.id, intents: tracked }), { mode: 0o600 })
}
console.log(JSON.stringify({ mode: 'test', scope: 'real Stripe API prototype; not application Checkout E2E', results, cleanup: 'session expired; successful test charges refunded; remaining authorizations canceled' }, null, 2))
