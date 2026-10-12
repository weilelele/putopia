// Read and optionally refund only this harness's dedicated sandbox fixtures.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
const base = '/private/tmp/putopia-initiation-sandbox'
const local = parseEnv(await fs.readFile(`${base}/local.env`, 'utf8'))
const credentials = parseEnv(await fs.readFile(`${base}/stripe.env`, 'utf8'))
assert.equal(new URL(local.API_URL).hostname, '127.0.0.1')
assert.match(credentials.STRIPE_SECRET_KEY, /^(sk|rk|rkcs)_test_/)
const stripe = new Stripe(credentials.STRIPE_SECRET_KEY)
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
assert.equal((await admin.from('putopia_payment_sandbox').select('id').single()).data?.id, 'local-only-fixture-v1')
const sessions = JSON.parse(await fs.readFile(`${base}/checkout-sessions.json`, 'utf8'))
const results = []
for (const fixture of sessions) {
  const session = await stripe.checkout.sessions.retrieve(fixture.sessionId)
  assert.equal(session.livemode, false)
  assert.equal(session.metadata.order_id, fixture.orderId)
  const intent = session.payment_intent ? await stripe.paymentIntents.retrieve(session.payment_intent) : null
  const queries = await Promise.all(['initiation_orders', 'initiation_members', 'initiation_entitlements', 'initiation_shipments'].map(table =>
    admin.from(table).select('*').eq(table === 'initiation_orders' ? 'id' : 'order_id', fixture.orderId)))
  for (const query of queries) assert.equal(query.error, null)
  const [orders, members, entitlements, shipments] = queries.map(q => q.data)
  const allShipments = await admin.from('initiation_shipments').select('position,legacy_order_id').eq('user_id', fixture.userId)
  assert.equal(allShipments.error, null)
  results.push({ kind: fixture.kind, session: session.status, payment: session.payment_status,
    intent: intent?.status, received: intent?.amount_received, order: orders[0]?.status,
    members: members.length, activeMembers: members.filter(m => m.active).length,
    entitlements: entitlements.length, activeEntitlements: entitlements.filter(e => e.active).length,
    shipments: shipments.length, totalShipments: allShipments.data.length,
    legacyShipments: allShipments.data.filter(s => s.legacy_order_id).length })
  if (process.argv.includes('--refund') && intent?.status === 'succeeded') {
    assert.equal(intent.livemode, false)
    await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `sandbox-cleanup:${fixture.orderId}` })
  }
}
if (process.argv.includes('--assert-paid')) {
  for (const result of results) {
    const unsupported = result.kind === 'unsupported'
    assert.equal(result.order, unsupported ? 'canceled' : 'paid')
    assert.equal(result.received, unsupported ? 0 : result.kind === 'standard' ? 52000 : 40000)
    assert.equal(result.activeMembers, unsupported ? 0 : 1)
    assert.equal(result.activeEntitlements, unsupported ? 0 : 1)
    assert.equal(result.shipments, unsupported ? 0 : result.kind === 'standard' ? 4 : 2)
    assert.equal(result.totalShipments, unsupported ? 0 : 4)
  }
}
if (process.argv.includes('--assert-refunded')) {
  for (const result of results) {
    assert.equal(result.order, result.kind === 'unsupported' ? 'canceled' : 'refunded')
    assert.equal(result.activeMembers, 0)
    assert.equal(result.activeEntitlements, 0)
    assert.equal(result.totalShipments, result.kind === 'unsupported' ? 0 : 4)
  }
}
const stage = process.argv.includes('--assert-refunded') ? 'refunded' : 'paid'
await fs.writeFile(`${base}/integration-${stage}.json`, JSON.stringify(results, null, 2), { mode: 0o600 })
console.log(JSON.stringify(results, null, 2))
