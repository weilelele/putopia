// Pure in-memory PostgreSQL migration test. Never connects to production.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
let assertions = 0
const check = (actual, expected) => { assert.deepEqual(actual, expected); assertions++ }
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon,authenticated,service_role;
  create table initiation_orders(id uuid primary key,product_type text not null default 'voyager_initiation',status text not null default 'pending',
    paid_at timestamptz,stripe_session_id text);
  grant select,insert,update,delete on initiation_orders to service_role;`)
await db.query("insert into initiation_orders(id,status,paid_at,stripe_session_id) values($1,'paid',now(),'historic')", [id(99)])
await db.exec(await readFile(new URL('../schema_v102.sql', import.meta.url), 'utf8'))
check((await rows('select count(*)::int n from initiation_analytics_outbox'))[0].n, 0)
check((await rows("select relrowsecurity from pg_class where oid='public.initiation_analytics_outbox'::regclass"))[0].relrowsecurity, true)
for (const role of ['anon','authenticated']) {
  check((await rows("select has_table_privilege($1,'initiation_analytics_outbox','SELECT') r,has_function_privilege($1,'claim_initiation_analytics(uuid,integer)','EXECUTE') c", [role]))[0], { r: false, c: false })
}
check((await rows("select bool_and(not prosecdef) ok from pg_proc where proname in ('queue_initiation_analytics','claim_initiation_analytics','queue_initiation_checkout_analytics')"))[0].ok, true)
await db.exec('set role service_role')
await db.query('insert into initiation_orders(id) values($1),($2),($3)', [id(1),id(2),id(3)])
check((await rows('select count(*)::int n from initiation_analytics_outbox'))[0].n, 0)
await db.query("update initiation_orders set stripe_session_id='cs_1' where id=$1", [id(1)])
let [checkout] = await rows('select * from initiation_analytics_outbox where order_id=$1', [id(1)])
check(checkout.event, 'initiation_checkout_started'); check(checkout.reused, false)
await db.query('select queue_initiation_checkout_analytics($1,true)', [id(1)])
check((await rows('select count(*)::int n from initiation_analytics_outbox where order_id=$1', [id(1)]))[0].n, 1)
await db.query("update initiation_orders set status='payment_review' where id=$1", [id(1)])
check((await rows("select count(*)::int n from initiation_analytics_outbox where event='initiation_purchase_completed'"))[0].n, 0)
await db.query("update initiation_orders set status='paid',paid_at='2026-10-14T00:00:00Z' where id=$1", [id(1)])
let [purchase] = await rows("select * from initiation_analytics_outbox where order_id=$1 and event='initiation_purchase_completed'", [id(1)])
check(new Date(purchase.event_time).toISOString(), '2026-10-14T00:00:00.000Z')
await db.query("update initiation_orders set status='paid',paid_at=now() where id=$1", [id(1)])
check((await rows("select event_uuid from initiation_analytics_outbox where order_id=$1 and event='initiation_purchase_completed'", [id(1)]))[0].event_uuid, purchase.event_uuid)
const claims = await rows('select * from claim_initiation_analytics($1,5)', [id(1)])
check(claims.length, 2); check(claims.every(c => c.status === 'processing' && c.attempt_count === 1), true)
check((await rows('select * from claim_initiation_analytics($1,5)', [id(1)])).length, 0)
await db.query("update initiation_analytics_outbox set claimed_at=now()-interval '6 minutes' where order_id=$1", [id(1)])
const reclaimed = await rows('select * from claim_initiation_analytics($1,5)', [id(1)])
check(reclaimed.every(c => c.attempt_count === 2), true)
check(reclaimed.find(c => c.event === purchase.event).event_uuid, purchase.event_uuid)
check((await rows("update initiation_analytics_outbox set status='sent',sent_at=now() where order_id=$1 and event=$2 and claim_token=$3 returning order_id", [id(1),claims[0].event,claims[0].claim_token])).length, 0)
await db.query("update initiation_analytics_outbox set status='sent',sent_at=now(),claimed_at=null,claim_token=null where order_id=$1", [id(1)])
check((await rows('select * from claim_initiation_analytics($1,5)', [id(1)])).length, 0)
await db.query("update initiation_orders set analytics_context='{" + '"disabled":true' + "}',stripe_session_id='cs_2' where id=$1", [id(2)])
check((await rows('select status from initiation_analytics_outbox where order_id=$1', [id(2)]))[0].status, 'skipped')
await db.exec('begin')
await db.query("update initiation_orders set status='paid',paid_at=now() where id=$1", [id(3)])
await db.exec('rollback')
check((await rows('select count(*)::int n from initiation_analytics_outbox where order_id=$1', [id(3)]))[0].n, 0)
await db.exec('reset role')
for (const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`)
  await assert.rejects(db.query('select * from initiation_analytics_outbox'), /permission denied/); assertions++
  await assert.rejects(db.query('select queue_initiation_checkout_analytics(null,true)'), /permission denied/); assertions++
  await assert.rejects(db.query('select * from claim_initiation_analytics(null,5)'), /permission denied/); assertions++
  await db.exec('reset role')
}
await db.close()
console.log(JSON.stringify({ passed: true, assertions, environment: 'in-memory PostgreSQL; no production writes' }))
