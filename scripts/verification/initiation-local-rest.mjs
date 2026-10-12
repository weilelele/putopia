// Real local Supabase Auth/PostgREST test; payment evidence here is synthetic.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
const directory = '/private/tmp/putopia-initiation-sandbox'
const env = parseEnv(await fs.readFile(`${directory}/local.env`, 'utf8'))
assert.equal(new URL(env.API_URL).hostname, '127.0.0.1')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, options)
const marker = await admin.from('putopia_payment_sandbox').select('id').single()
assert.equal(marker.data?.id, 'local-only-fixture-v1')
const fixtures = JSON.parse(await fs.readFile(`${directory}/fixtures.json`, 'utf8'))
let assertions = 0
function equal(value, expected) { assert.deepEqual(value, expected); assertions++ }
for (const fixture of fixtures) {
  const client = createClient(env.API_URL, env.ANON_KEY, options)
  const login = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password })
  equal(login.error, null)
  equal((await client.auth.getUser()).data.user.id, fixture.id)
  const args = { p_user: fixture.id, p_price: `price_fixture_${fixture.kind}`, p_product: 'prod_local_fixture', p_kind: fixture.kind, p_device_source: null }
  const forbidden = await client.rpc('reserve_initiation', args)
  equal(forbidden.error?.code, '42501')
  const spoof = await client.from('voyager_profiles').update({ role: 'architect' }).eq('id', fixture.id)
  equal(!!spoof.error, true)
  const eligibility = await admin.rpc('eligible_legacy_initiation_order', { p_user: fixture.id })
  equal(!!eligibility.data, fixture.kind === 'legacy_upgrade')
  const first = await admin.rpc('reserve_initiation', args)
  equal(first.error, null)
  equal(first.data.amount, fixture.kind === 'standard' ? 52000 : 40000)
  const repeat = await admin.rpc('reserve_initiation', args)
  equal(repeat.data.id, first.data.id)
  const intent = `pi_local_fixture_${randomUUID()}`
  const completeArgs = { p_order: first.data.id, p_session: `cs_test_local_${randomUUID()}`, p_user: fixture.id, p_intent: intent,
    p_shipping: { name: 'Local Fixture', address: { line1: '1 Fixture Street', city: 'Fixture', state: 'CA', country: 'US', postal_code: '00000' } } }
  equal((await admin.rpc('complete_initiation', completeArgs)).error, null)
  equal((await admin.rpc('complete_initiation', completeArgs)).error, null)
  const packs = await admin.from('initiation_shipments').select('position').eq('user_id', fixture.id)
  equal(packs.data.length, 4)
  equal(new Set(packs.data.map(p => p.position)).size, 4)
  equal((await client.rpc('effective_access_role')).data, 'voyager')
  const privateOrders = await client.from('initiation_orders').select('id')
  // PostgREST reports either denied privileges or no rows under RLS, never data.
  equal(privateOrders.error !== null || privateOrders.data?.length === 0, true)
  equal((await admin.rpc('hold_initiation_payment', { p_intent: intent, p_reason: 'refunded' })).error, null)
  equal((await client.rpc('effective_access_role')).data, fixture.kind === 'legacy_upgrade' ? 'voyager' : 'applicant')
}
console.log(JSON.stringify({ assertions, status: 'passed', auth: 'real local Supabase', rest: 'real PostgREST', stripeEvidence: 'synthetic SQL evidence; no Stripe calls', productionWrites: 0 }))
