// Synthetic in-memory Postgres only. Pass an installed PGlite module path.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const rows = async (sql, values = []) => (await db.query(sql, values)).rows
const id = n => `82500000-0000-4000-8000-${String(n).padStart(12, '0')}`
const checkout = 'https://jtuuus-k3.myshopify.com/cart/c/fixture?key=fixture'
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.initiation_orders (
      id uuid primary key, product_type text not null default 'voyager_initiation',
      status text not null default 'pending', stripe_session_id text, stripe_payment_intent text, paid_at timestamptz
    );
    create table public.initiation_shopify_checkouts (
      order_id uuid primary key references public.initiation_orders(id), checkout_url text
    );
  `)
  await db.exec(await readFile(new URL('../schema_v102.sql', import.meta.url), 'utf8'))
  await db.query('insert into initiation_orders(id) values($1)', [id(1)])
  await db.query('insert into initiation_shopify_checkouts values($1,$2)', [id(1), checkout])
  await db.exec(await readFile(new URL('../schema_v125.sql', import.meta.url), 'utf8'))
  assert.equal((await rows('select * from initiation_analytics_outbox')).length, 0, 'no historical backfill')

  await db.query('insert into initiation_orders(id) values($1)', [id(2)])
  await db.query('insert into initiation_shopify_checkouts(order_id) values($1)', [id(2)])
  assert.equal((await rows('select * from initiation_analytics_outbox')).length, 0, 'reservation alone is not checkout')
  await db.query('update initiation_shopify_checkouts set checkout_url=$2 where order_id=$1', [id(2), checkout])
  const [started] = await rows('select * from initiation_analytics_outbox')
  assert.equal(started.event, 'initiation_checkout_started')
  assert.equal(started.status, 'pending')
  await db.query('update initiation_shopify_checkouts set checkout_url=$2 where order_id=$1', [id(2), checkout])
  assert.equal((await rows('select * from initiation_analytics_outbox')).length, 1)
  assert.equal((await rows('select * from initiation_analytics_outbox'))[0].event_uuid, started.event_uuid)

  // The existing payment trigger remains the source of the original paid timestamp.
  await db.query("update initiation_orders set status='paid',paid_at=$2 where id=$1", [id(2), '2026-11-18T00:00:00Z'])
  await db.query("update initiation_orders set status='paid' where id=$1", [id(2)])
  const paid = await rows("select * from initiation_analytics_outbox where event='initiation_purchase_completed'")
  assert.equal(paid.length, 1)
  assert.equal(new Date(paid[0].event_time).toISOString(), '2026-11-18T00:00:00.000Z')

  await db.query("insert into initiation_orders(id,analytics_context) values($1,'{\"disabled\":true}')", [id(3)])
  await db.query('insert into initiation_shopify_checkouts values($1,$2)', [id(3), checkout])
  assert.equal((await rows('select status from initiation_analytics_outbox where order_id=$1', [id(3)]))[0].status, 'skipped')

  await db.query('insert into initiation_orders(id) values($1)', [id(4)])
  await db.query('insert into initiation_shopify_checkouts(order_id) values($1)', [id(4)])
  await db.exec('begin')
  await db.query('update initiation_shopify_checkouts set checkout_url=$2 where order_id=$1', [id(4), checkout])
  await db.exec('rollback')
  assert.equal((await rows('select * from initiation_analytics_outbox where order_id=$1', [id(4)])).length, 0)
  for (const role of ['anon', 'authenticated']) {
    const [access] = await rows("select has_function_privilege($1,'public.queue_initiation_shopify_checkout_analytics()','execute') as allowed", [role])
    assert.equal(access.allowed, false)
  }
  console.log('Shopify analytics passed: no backfill, binding timestamp, deduplication, paid trigger, opt-out, rollback and permissions')
} finally {
  await db.close()
}
