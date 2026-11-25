// Synthetic in-memory Postgres only. No environment, network, live orders or external database.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const id = n => `82500000-0000-4000-8000-${String(n).padStart(12, '0')}`
const query = async (sql, args = []) => (await db.query(sql, args)).rows
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table initiation_orders(id uuid primary key,user_id uuid not null,status text not null default 'pending',
      paid_at timestamptz,stripe_livemode boolean not null default true,
      analytics_context jsonb not null default '{"environment":"production"}');
    create table initiation_shopify_checkouts(order_id uuid primary key references initiation_orders(id),shop text not null,
      checkout_url text,shopify_order_id text,authorization_id text,capture_id text);
    create table initiation_analytics_outbox(order_id uuid references initiation_orders(id),event text,capture_source text,
      event_time timestamptz,primary key(order_id,event));
  `)
  await db.exec(await readFile(new URL('../schema_v129.sql', import.meta.url), 'utf8'))
  await db.query('insert into initiation_orders(id,user_id) values($1,$1)', [id(6)])
  await db.query(`insert into initiation_shopify_checkouts(order_id,shop,shopify_order_id)
    values($1,'jtuuus-k3.myshopify.com','gid://shopify/Order/6')`, [id(6)])
  await db.exec(await readFile(new URL('../schema_v130.sql', import.meta.url), 'utf8'))
  assert.equal((await query('select * from initiation_shopify_payment_metadata_queue')).length, 1, 'queue metadata rereads for existing formal orders')
  assert.equal((await query('select * from initiation_checkout_diagnostics')).length, 0, 'metadata backfill never invents historical activity')
  for (let n = 1; n <= 5; n++) {
    await db.query('insert into initiation_orders(id,user_id) values($1,$2)', [id(n), id(n === 5 ? 1 : n)])
    await db.query(`insert into initiation_shopify_checkouts(order_id,shop,checkout_url,shopify_order_id)
      values($1,'jtuuus-k3.myshopify.com','https://jtuuus-k3.myshopify.com/cart/fixture',$2)`, [id(n), `gid://shopify/Order/${n}`])
    await db.query(`insert into initiation_analytics_outbox values($1,'initiation_checkout_started','server','2020-01-01T12:00Z')`, [id(n)])
  }
  for (const [n, method] of [[1, 'shop_pay'], [2, 'card'], [5, 'shop_pay']]) {
    await db.query(`select record_initiation_shopify_payment_method($1,'jtuuus-k3.myshopify.com',$2,$3,'2020-01-01T12:01Z')`,
      [id(n), `gid://shopify/Order/${n}`, method])
  }
  for (const n of [1, 2]) {
    await db.query(`update initiation_orders set status='paid',paid_at='2020-01-01T12:02Z' where id=$1`, [id(n)])
    await db.query('update initiation_shopify_checkouts set shopify_order_id=$2,authorization_id=$3,capture_id=$4 where order_id=$1',
      [id(n), `gid://shopify/Order/${n}`, `gid://shopify/OrderTransaction/${n}0`, `gid://shopify/OrderTransaction/${n}1`])
  }
  await db.query(`update initiation_orders set analytics_context='{"environment":"production","is_internal_qa":true}' where id=$1`, [id(4)])
  for (const stage of ['viewed', 'contact_submitted', 'address_submitted', 'shipping_submitted', 'payment_submitted', 'completed_viewed']) {
    await db.query(`insert into initiation_analytics_outbox values($1,$2,'shopify_pixel','2020-01-01T12:01Z')`, [id(2), `initiation_checkout_${stage}`])
  }
  await db.query(`insert into initiation_analytics_outbox values($1,'initiation_checkout_completed_viewed','shopify_pixel','2020-01-01T12:03Z')`, [id(1)])
  const report = async excluded => query(`select * from report_shopify_checkout_coverage('2020-01-01T00:00Z','2020-01-02T00:00Z','2020-01-02T06:00Z',$1)`, [excluded])
  const result = await report([])
  const shop = result.find(r => r.checkout_flow === 'shop_pay')
  assert.equal(Number(shop.users), 1, 'deduplicate a buyer with two orders in the same flow')
  assert.equal(Number(shop.orders), 2)
  assert.equal(Number(shop.paid_users), 1, 'paid Shop Pay needs no intermediate Pixel steps')
  assert.equal(Number(shop.initial_view_users), 0)
  assert.equal(Number(shop.initial_view_unobserved_users), 1, 'missing is unobserved, not dropout')
  assert.equal(Number(shop.unpaid_users), 0, 'a paid buyer with another unpaid order is still a paid buyer')
  const standard = result.find(r => r.checkout_flow === 'standard')
  assert.equal(Number(standard.contact_users), 1)
  assert.equal(Number(standard.payment_users), 1)
  assert.equal(Number(standard.paid_orders), 1)
  assert.equal(Number(result.find(r => r.checkout_flow === 'unknown').users), 1, 'QA is excluded')
  assert.ok(result.every(r => Object.keys(r).every(k => !/drop|lost|failed/.test(k))))
  assert.ok(!(await report([id(1)])).some(r => r.checkout_flow === 'shop_pay'), 'apply linked internal cohort exclusions')

  // A stale, unrelated, unknown or future metadata payload cannot overwrite a verified method.
  const before = await query('select * from initiation_orders order by id')
  const oldJob = (await query('select queued_at from initiation_shopify_payment_metadata_queue where order_id=$1',[id(1)]))[0]
  await db.query('update initiation_shopify_checkouts set capture_id=capture_id where order_id=$1',[id(1)])
  await db.query('delete from initiation_shopify_payment_metadata_queue where order_id=$1 and queued_at=$2',[id(1), oldJob.queued_at])
  assert.equal((await query('select * from initiation_shopify_payment_metadata_queue where order_id=$1',[id(1)])).length,1,
    'late metadata completion cannot delete newer capture work')
  await db.query(`select record_initiation_shopify_payment_method($1,'jtuuus-k3.myshopify.com','gid://shopify/Order/1','card','2019-12-31Z')`, [id(1)])
  await db.query(`select record_initiation_shopify_payment_method($1,'jtuuus-k3.myshopify.com','gid://shopify/Order/999','card','2020-01-02Z')`, [id(1)])
  assert.equal((await query('select payment_method from initiation_shopify_checkouts where order_id=$1', [id(1)]))[0].payment_method, 'shop_pay')
  await assert.rejects(db.query(`select record_initiation_shopify_payment_method($1,'jtuuus-k3.myshopify.com','gid://shopify/Order/1','unknown',now())`, [id(1)]))
  assert.deepEqual(await query('select * from initiation_orders order by id'), before, 'classification never changes financial facts')
  await db.query(`select record_initiation_shopify_payment_method($1,'jtuuus-k3.myshopify.com','gid://shopify/Order/3','shop_pay','2020-01-03Z')`, [id(3)])
  assert.equal(Number((await report([])).find(r => r.checkout_flow === 'unknown').users), 1, 'later classification cannot leak through an earlier cutoff')
  for (let n = 0; n < 2; n++) await db.query(`select record_shopify_observation_failure('pixel_unverified','missing_reference','checkout_started')`)
  assert.equal(Number((await query('select occurrences from shopify_observation_health'))[0].occurrences), 2)
  assert.equal((await query('select * from initiation_checkout_diagnostics')).length, 0, 'unbound reports never become person-level events')
  await assert.rejects(db.query(`insert into initiation_checkout_diagnostics(order_id,event_key,event,capture_source,event_time)
    values($1,repeat('a',64),'initiation_checkout_payment_method_observed','shopify_pixel',now())`, [id(1)]))
  for (const role of ['anon', 'authenticated']) {
    assert.equal((await query(`select has_table_privilege($1,'shopify_observation_health','SELECT') as allowed`, [role]))[0].allowed, false)
    assert.equal((await query(`select has_function_privilege($1,'report_shopify_checkout_coverage(timestamptz,timestamptz,timestamptz,uuid[])','execute') as allowed`, [role]))[0].allowed, false)
    assert.equal((await query(`select has_function_privilege($1,'record_initiation_shopify_payment_method(uuid,text,text,text,timestamptz)','execute') as allowed`, [role]))[0].allowed, false)
  }
  await assert.rejects(db.query(`select * from report_shopify_checkout_coverage('2020-01-01Z','2020-01-03Z','2020-01-02Z','{}')`))
  console.log('v130 passed: payment classification, unknown coverage, paid-without-Pixel, exclusions, cutoff, deduplication, telemetry isolation and permissions')
} finally { await db.close() }
