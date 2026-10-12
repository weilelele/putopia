import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const base = '/private/tmp/putopia-initiation-sandbox'
const env = parseEnv(await fs.readFile(`${base}/local.env`, 'utf8'))
const fixture = JSON.parse(await fs.readFile(`${base}/full-fixture.json`, 'utf8'))
assert.equal(new URL(env.DB_URL).hostname, '127.0.0.1')
const { default: pg } = await import(pathToFileURL('/private/tmp/putopia-payment-postgres/node_modules/pg/lib/index.js'))
const db = new pg.Client({ connectionString: env.DB_URL }); await db.connect()
assert.equal((await db.query('select id from putopia_payment_sandbox')).rows[0].id, 'local-only-fixture-v1')
const result = (await db.query(`select
 (select version from voyager_intake where user_id=$1) calibration,
 (select status from initiation_orders where user_id=$1 order by created_at desc limit 1) payment,
 (select count(*)::int from initiation_members where user_id=$1 and active) active_members,
 (select count(*)::int from initiation_entitlements where user_id=$1 and active) active_entitlements,
 (select count(*)::int from initiation_shipments where user_id=$1) shipments,
 (select count(*)::int from device_batch_units where user_id=$1) claimed_units,
 (select claimed_quantity from device_batches where slug=$2) batch_claimed,
 (select status from device_batch_units where user_id=$1 limit 1) unit_status,
 (select jsonb_agg(jsonb_build_object('position',position,'status',status)) from initiation_shipments where user_id=$1) shipment_states,
 has_bound_console($1) bound`, [fixture.id, fixture.slug])).rows[0]
await db.end()
const stage = process.argv[2] ?? 'snapshot'
assert.match(stage, /^[a-z-]+$/)
assert.equal(result.calibration, 'voyager-profile-v1')
assert.equal(result.shipments, 4)
if (['before-claim', 'after-cancel'].includes(stage)) {
  assert.equal(result.payment, 'paid'); assert.equal(result.claimed_units, 0); assert.equal(result.bound, false)
}
if (stage === 'after-claim') {
  assert.equal(result.payment, 'paid'); assert.equal(result.claimed_units, 1); assert.equal(result.batch_claimed, 1)
  // Record the bound value as evidence; do not encode disputed shipment timing as correct.
}
if (stage === 'after-refund') {
  assert.equal(result.payment, 'refunded'); assert.equal(result.active_members, 0)
  assert.equal(result.active_entitlements, 0); assert.equal(result.bound, false)
}
await fs.writeFile(`${base}/full-${stage}.json`, JSON.stringify(result, null, 2), { mode: 0o600 })
console.log(JSON.stringify(result, null, 2))
