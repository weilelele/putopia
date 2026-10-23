import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  for (const block of [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)) await db.exec(block[1])
  for (const name of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105']) {
    await db.exec(await fs.readFile(new URL(`../schema_v${name}.sql`, import.meta.url), 'utf8'))
  }
  const rows = async (sql, params = []) => (await db.query(sql, params)).rows
  const scalar = async (sql, params = []) => Object.values((await rows(sql, params))[0])[0]
  const uid = number => `18000000-0000-0000-0000-${String(number).padStart(12, '0')}`
  const person = async (number, kind = 'human') => rows("insert into voyager_profiles(id,role,account_kind) values($1,'applicant',$2)", [uid(number), kind])
  const legacy = async (number, suffix, status = 'paid', session = 'cs_live_') => scalar(
    "insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack',$2,1200,'usd',now(),$3,$4) returning id",
    [uid(number), status, session + suffix, 'pi_' + suffix])
  const reserve = async (number, kind) => scalar('select reserve_initiation_v2($1,$2,$3,$4,null)', [uid(number), 'price_' + kind, 'prod_fixture', kind])
  const complete = async (order, number) => rows('select complete_initiation($1,$2,$3,$4,$5)', [order.id, 'cs_fixture_' + order.id, uid(number), 'pi_' + order.id, { name: 'Fixture', address: { line1: '1 Test', country: 'US' } }])
  const migration = await fs.readFile(new URL('../schema_v108.sql', import.meta.url), 'utf8')
  for (let number = 1; number <= 12; number++) await person(number, number === 8 ? 'npc' : 'human')
  await db.exec('update initiation_batches set checkout_open=true')
  await legacy(1, 'first')
  await legacy(1, 'duplicate')
  const pendingSource = await legacy(2, 'pending_upgrade')
  const [pending] = await rows("insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,legacy_order_id) values($1,'price_old400','prod_old','legacy_upgrade',40000,$2) returning *", [uid(2), pendingSource])
  await legacy(3, 'already_complete')
  const upgraded = await reserve(3, 'legacy_upgrade')
  await complete(upgraded, 3)
  await legacy(4, 'shipped', 'shipped')
  await legacy(5, 'refunded', 'refunded')
  await legacy(6, 'held')
  await rows("select hold_initiation_payment('pi_held','disputed')")
  await legacy(7, 'test', 'paid', 'cs_test_')
  await legacy(8, 'npc')
  const initial = await reserve(9, 'initial')
  await complete(initial, 9)
  await legacy(9, 'also_initial')
  await rows("update voyager_profiles set role='architect' where id=$1", [uid(4)])
  const preservedTables = ['voyager_orders', 'initiation_orders', 'initiation_shipments', 'device_order_packs', 'initiation_entitlements']
  const before = await Promise.all(preservedTables.map(table => rows(`select * from ${table} order by id`.replace('initiation_entitlements order by id', 'initiation_entitlements order by user_id'))))
  await db.exec(migration)
  const after = await Promise.all(preservedTables.map(table => rows(`select * from ${table} order by id`.replace('initiation_entitlements order by id', 'initiation_entitlements order by user_id'))))
  assert.deepEqual(after, before)
  assert.equal(await scalar('select count(*)::int from initiation_members'), 5)
  assert.equal(await scalar('select initiation_occupied_seats()'), 5)
  assert.deepEqual(await scalar('select initiation_availability()'), { open: true, capacity: 100, initiated: 5, paid: 5, granted: 0, remaining: 95 })
  assert.equal(await scalar('select legacy_order_id from initiation_members where user_id=$1', [uid(1)]), await scalar('select eligible_legacy_initiation_order($1)', [uid(1)]))
  assert.equal(await scalar("select batch_label from voyager_profiles where id=$1", [uid(1)]), 'S26')
  assert.equal(await scalar("select role from voyager_profiles where id=$1", [uid(4)]), 'architect')
  assert.equal((await scalar('select initiation_access_state($1)', [uid(1)])).formal, true)
  assert.equal(await scalar('select count(*)::int from initiation_entitlements where user_id=$1', [uid(1)]), 0)
  await assert.rejects(() => rows('select claim_initiation_console($1,null)', [uid(1)]), /entitlement/)
  for (let repeat = 0; repeat < 2; repeat++) await rows('select sync_legacy_initiation_member($1)', [uid(1)])
  assert.equal(await scalar('select initiation_occupied_seats()'), 5)
  await rows('select record_initiation_refund($1,3800,3800)', ['pi_' + initial.id])
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(9)]), true)
  assert.equal(await scalar('select legacy_order_id from initiation_members where user_id=$1', [uid(9)]), await scalar('select eligible_legacy_initiation_order($1)', [uid(9)]))
  await rows("select hold_initiation_payment('pi_first','refunded')")
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(1)]), true)
  await complete(pending, 2)
  await complete(pending, 2)
  assert.equal(await scalar('select amount from initiation_orders where id=$1', [pending.id]), 40000)
  assert.equal(await scalar('select count(*)::int from initiation_members where user_id=$1', [uid(2)]), 1)
  assert.equal(await scalar('select initiation_occupied_seats()'), 5)
  await rows('select record_initiation_refund($1,40000,40000)', ['pi_' + pending.id])
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(2)]), true)
  assert.equal(await scalar('select active from initiation_entitlements where user_id=$1', [uid(2)]), false)
  await rows("select hold_initiation_payment('pi_pending_upgrade','refunded')")
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(2)]), false)
  await rows("select hold_initiation_payment('pi_already_complete','disputed')")
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(3)]), false)
  assert.equal(await scalar('select active from initiation_entitlements where user_id=$1', [uid(3)]), false)
  await legacy(10, 'late_callback')
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(10)]), true)
  await rows("update voyager_orders set status='preparing' where user_id=$1", [uid(10)])
  assert.equal(await scalar('select count(*)::int from initiation_members where user_id=$1', [uid(10)]), 1)
  await rows("update voyager_orders set status='refunded' where user_id=$1", [uid(10)])
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(10)]), false)
  await legacy(11, 'source_race')
  const racingUpgrade = await reserve(11, 'legacy_upgrade')
  await rows("select hold_initiation_payment('pi_source_race','refunded')")
  await complete(racingUpgrade, 11)
  assert.equal(await scalar('select status from initiation_orders where id=$1', [racingUpgrade.id]), 'payment_review')
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(11)]), false)
  assert.equal(await scalar('select count(*)::int from initiation_entitlements where user_id=$1', [uid(11)]), 0)
  await db.exec(`insert into voyager_profiles(id,role,account_kind,member_source,batch_label)
    select ('28000000-0000-0000-0000-'||lpad(number::text,12,'0'))::uuid,'voyager','human','granted','S26'
    from generate_series(1,100-(select public.initiation_occupied_seats())::int) number;
    insert into initiation_members(user_id,source,grant_note)
    select id,'granted','Isolated fixture' from voyager_profiles where id::text like '28000000-%';`)
  assert.equal(await scalar('select initiation_occupied_seats()'), 100)
  const fullUpgrade = await reserve(1, 'legacy_upgrade')
  await complete(fullUpgrade, 1)
  assert.equal(await scalar('select initiation_occupied_seats()'), 100)
  await assert.rejects(() => reserve(12, 'initial'), /fully reserved/)
  await assert.rejects(() => legacy(12, 'capacity'), /exceeds capacity/)
  assert.equal(await scalar('select count(*)::int from voyager_orders where user_id=$1', [uid(12)]), 0)
  await rows('select record_initiation_refund($1,46000,46000)', ['pi_' + fullUpgrade.id])
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(1)]), true)
  assert.equal(await scalar('select initiation_occupied_seats()'), 100)
  const paidCount = (await scalar('select initiation_availability()')).paid
  await rows("select hold_initiation_payment('pi_duplicate','disputed')")
  assert.equal(await scalar('select active from initiation_members where user_id=$1', [uid(1)]), false)
  assert.equal((await scalar('select initiation_availability()')).paid, paidCount - 1)
  await db.exec('set role authenticated')
  await assert.rejects(() => rows('select sync_legacy_initiation_member($1)', [uid(1)]), /permission denied/)
  await assert.rejects(() => rows('select * from initiation_members'), /permission denied/)
  await db.exec('reset role')
  const overflowDb = new PGlite()
  try {
    for (const block of [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)) await overflowDb.exec(block[1])
    for (const name of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105']) {
      await overflowDb.exec(await fs.readFile(new URL(`../schema_v${name}.sql`, import.meta.url), 'utf8'))
    }
    await overflowDb.exec(`insert into voyager_profiles(id,role,account_kind,member_source,batch_label)
      select ('38000000-0000-0000-0000-'||lpad(number::text,12,'0'))::uuid,'voyager','human','granted','S26'
      from generate_series(1,100) number;
      insert into initiation_members(user_id,source,grant_note) select id,'granted','Isolated fixture' from voyager_profiles;
      insert into voyager_profiles(id,role,account_kind) values('${uid(1)}','applicant','human');
      insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent)
      values('${uid(1)}','voyager_pack','paid',1200,'usd',now(),'cs_live_overflow','pi_overflow');`)
    await assert.rejects(() => overflowDb.exec(migration), /exceeds capacity/)
    await overflowDb.exec('rollback')
    assert.equal((await overflowDb.query("select count(*)::int as count from information_schema.columns where table_name='initiation_members' and column_name='legacy_order_id'")).rows[0].count, 0)
    assert.equal((await overflowDb.query('select count(*)::int as count from initiation_members')).rows[0].count, 100)
    assert.equal((await overflowDb.query('select role from voyager_profiles where id=$1', [uid(1)])).rows[0].role, 'applicant')
  } finally {
    await overflowDb.close()
  }
  console.log('v108 isolated checks passed: historical backfill, deduplication, unchanged payments and packs, late callbacks, refund holds, full-batch upgrade and ACLs')
} finally {
  await db.close()
}
