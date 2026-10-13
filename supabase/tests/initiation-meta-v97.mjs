// Isolated outbox/ACL regression test; no network or application environment.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)

const db = new PGlite()
let assertions = 0
const check = (value, expected, message) => { assert.deepEqual(value, expected, message); assertions++ }
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create table public.initiation_orders (
    id uuid primary key, product_type text not null default 'voyager_initiation',
    status text not null default 'pending', paid_at timestamptz,
    amount integer not null default 52000, currency text not null default 'usd'
  );
  grant select, insert, update, delete on public.initiation_orders to service_role;
`)
await db.query("insert into initiation_orders(id,status,paid_at) values($1,'paid',now())", [id(99)])
await db.exec(await readFile(new URL('../schema_v97.sql', import.meta.url), 'utf8'))
check((await rows('select count(*)::int n from initiation_meta_purchases'))[0].n, 0, 'no historical backfill')
check((await rows("select relrowsecurity from pg_class where oid='public.initiation_meta_purchases'::regclass"))[0].relrowsecurity, true, 'RLS enabled')
for (const role of ['anon', 'authenticated']) {
  const [permissions] = await rows("select has_table_privilege($1,'public.initiation_meta_purchases','SELECT') as can_read, has_function_privilege($1,'public.claim_initiation_meta_purchases(uuid,integer)','EXECUTE') as can_claim", [role])
  check(permissions, { can_read: false, can_claim: false }, `${role} has no event access`)
}
check((await rows("select prosecdef from pg_proc where oid='public.claim_initiation_meta_purchases(uuid,integer)'::regprocedure"))[0].prosecdef, false, 'claim is security invoker')
await db.exec('set role service_role')
for (let n = 1; n <= 7; n++) await db.query('insert into initiation_orders(id) values($1)', [id(n)])
await db.query("update initiation_orders set status='payment_review',paid_at=now() where id=$1", [id(2)])
await db.query("update initiation_orders set status='canceled' where id=$1", [id(3)])
await db.query("update initiation_orders set status='refunded',paid_at=now() where id=$1", [id(4)])
check((await rows('select count(*)::int n from initiation_meta_purchases'))[0].n, 0, 'non-paid states never enqueue')
await db.query("update initiation_orders set status='paid',paid_at='2026-10-13T15:00:00Z' where id=$1", [id(1)])
let [queued] = await rows('select * from initiation_meta_purchases where order_id=$1', [id(1)])
check(queued.event_id, `initiation_purchase_${id(1)}`, 'fixed event id')
check(new Date(queued.event_time).toISOString(), '2026-10-13T15:00:00.000Z', 'fixed paid time')
check(queued.status, 'pending', 'paid enqueues')
await db.query("update initiation_orders set status='paid',paid_at=now() where id=$1", [id(1)])
check((await rows('select count(*)::int n from initiation_meta_purchases where order_id=$1', [id(1)]))[0].n, 1, 'repeated paid does not duplicate')
check(new Date((await rows('select event_time from initiation_meta_purchases where order_id=$1', [id(1)]))[0].event_time).toISOString(), '2026-10-13T15:00:00.000Z', 'paid retry does not change event time')
await db.query("update initiation_orders set meta_attribution='{\"disabled\":true}',status='paid',paid_at=now() where id=$1", [id(5)])
check((await rows('select status from initiation_meta_purchases where order_id=$1', [id(5)]))[0].status, 'skipped', 'native opt-out skipped')
let [claim] = await rows('select * from claim_initiation_meta_purchases($1,10)', [id(1)])
check(claim.status, 'processing', 'atomic claim sets status')
check(claim.attempt_count, 1, 'attempt count increments')
assert.ok(claim.claim_token); assertions++
check((await rows('select * from claim_initiation_meta_purchases($1,10)', [id(1)])).length, 0, 'active lease cannot be reclaimed')
const oldToken = claim.claim_token
await db.query("update initiation_meta_purchases set claimed_at=now()-interval '6 minutes' where order_id=$1", [id(1)])
;[claim] = await rows('select * from claim_initiation_meta_purchases($1,10)', [id(1)])
assert.notEqual(claim.claim_token, oldToken); assertions++
check(claim.attempt_count, 2, 'stale lease increments attempts')
check(claim.event_id, queued.event_id, 'reclaim retains event id')
check(new Date(claim.event_time).toISOString(), '2026-10-13T15:00:00.000Z', 'reclaim retains event time')
check((await rows("update initiation_meta_purchases set status='sent',sent_at=now() where order_id=$1 and claim_token=$2 returning order_id", [id(1), oldToken])).length, 0, 'stale worker cannot finish new lease')
check((await rows("update initiation_meta_purchases set status='sent',sent_at=now() where order_id=$1 and claim_token=$2 returning order_id", [id(1), claim.claim_token])).length, 1, 'current worker can finish')
check((await rows('select * from claim_initiation_meta_purchases($1,10)', [id(1)])).length, 0, 'sent events are not reclaimed')
await db.query("update initiation_orders set status='paid',paid_at=now() where id=$1", [id(6)])
await db.query("update initiation_meta_purchases set next_attempt_at=now()+interval '1 hour' where order_id=$1", [id(6)])
check((await rows('select * from claim_initiation_meta_purchases($1,10)', [id(6)])).length, 0, 'backoff respected')
await db.query("update initiation_meta_purchases set next_attempt_at=now()-interval '1 second' where order_id=$1", [id(6)])
check((await rows('select * from claim_initiation_meta_purchases($1,10)', [id(6)])).length, 1, 'due retry becomes claimable')
await db.exec('begin')
await db.query("update initiation_orders set status='paid',paid_at=now() where id=$1", [id(7)])
await db.exec('rollback')
check((await rows('select status from initiation_orders where id=$1', [id(7)]))[0].status, 'pending', 'payment transaction rolls back')
check((await rows('select count(*)::int n from initiation_meta_purchases where order_id=$1', [id(7)]))[0].n, 0, 'outbox rolls back atomically with payment')
await db.exec('reset role')
for (const role of ['anon', 'authenticated']) {
  await db.exec(`set role ${role}`)
  await assert.rejects(db.query('select * from initiation_meta_purchases'), /permission denied/); assertions++
  await assert.rejects(db.query('select * from claim_initiation_meta_purchases(null,10)'), /permission denied/); assertions++
  await db.exec('reset role')
}
console.log(JSON.stringify({ passed: true, assertions, environment: 'in-memory PostgreSQL; no external DB or network' }))
await db.close()
