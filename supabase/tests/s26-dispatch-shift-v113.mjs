// Disposable PostgreSQL/WASM only. No network, environment, or real accounts.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const sql = name => fs.readFile(new URL(`../schema_v${name}.sql`, import.meta.url), 'utf8')
try {
  const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  for (const block of [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)) await db.exec(block[1])
  for (const name of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105', '108']) await db.exec(await sql(name))
  await db.exec(`alter table device_batches add column content jsonb, add column published_content jsonb;
    alter table device_order_packs add column stage_id text, add column stage_position int, add column label text, add column expected_window text;`)
  const rows = async (query, params = []) => (await db.query(query, params)).rows
  const scalar = async (query, params = []) => Object.values((await rows(query, params))[0])[0]
  const uid = number => `19000000-0000-0000-0000-${String(number).padStart(12, '0')}`
  const person = number => rows("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [uid(number)])
  const legacy = (number, suffix) => scalar("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),$2,$3) returning id", [uid(number), 'cs_live_' + suffix, 'pi_' + suffix])
  const reserve = (number, kind) => scalar('select reserve_initiation_v2($1,$2,$3,$4,null)', [uid(number), 'price_' + kind, 'prod_fixture', kind])
  const complete = (order, number) => rows('select complete_initiation($1,$2,$3,$4,$5)', [order.id, 'cs_fixture_' + order.id, uid(number), 'pi_' + order.id, { name: 'Fixture', address: { line1: '1 Test', country: 'US' } }])
  const months = async number => (await rows('select position,scheduled_month from initiation_shipments where user_id=$1 order by position', [uid(number)])).map(row => `${row.position}:${row.scheduled_month}`)
  const OLD = ['1:2026-10', '2:2026-11', '3:2026-12', '4:2027-01'], NEW = ['1:2026-12', '2:2027-01', '3:2027-02', '4:2027-03']

  for (let number = 1; number <= 7; number++) await person(number)
  await db.exec('update initiation_batches set checkout_open=true')

  await complete(await reserve(1, 'standard'), 1) // Untouched: every pack moves.
  await complete(await reserve(2, 'standard'), 2) // Pack 1 with a carrier, Pack 2 being prepared.
  await rows("update initiation_shipments set status='dispatched' where user_id=$1 and position=1", [uid(2)])
  await rows("update initiation_shipments set status='preparing' where user_id=$1 and position=2", [uid(2)])
  await complete(await reserve(3, 'initial'), 3)
  await legacy(4, 'before')
  assert.deepEqual(await months(1), OLD)

  const content = { estimatedCompletion: 'All three dispatch dates are not yet confirmed.', name: 'Kyoto One', distributionStages: [
    { id: 'initial-voyager-pack', window: 'Dispatch date not yet confirmed', summary: 'kept' },
    { id: 'components-pack', window: 'After Package 1' },
    { id: 'console', window: 'After Package 2' },
    { id: 'added-later', window: 'Left alone' },
  ] }
  await rows("insert into device_batches(slug,content,published_content) values('kyoto-one',$1,$1),('kamakura-one',$1,$1)", [content])
  const claim = await scalar("insert into voyager_orders(user_id,product_type,status,amount,currency,device_batch_slug) values($1,'device_batch_claim','paid',52000,'usd','kyoto-one') returning id", [uid(5)])
  const otherBatch = await scalar("insert into voyager_orders(user_id,product_type,status,amount,currency,device_batch_slug) values($1,'device_batch_claim','paid',52000,'usd','kamakura-one') returning id", [uid(6)])
  const pack = (order, position, status = 'planned') => rows("insert into device_order_packs(order_id,stage_id,stage_position,label,expected_window,status) values($1,$2,$3,'Fixture','Dispatch date not yet confirmed',$4)", [order, 'stage-' + position, position, status])
  await pack(claim, 1, 'shipped')
  await pack(claim, 2, 'preparing')
  await pack(claim, 3)
  await pack(otherBatch, 1)
  const windows = async order => (await rows('select expected_window from device_order_packs where order_id=$1 order by stage_position', [order])).map(row => row.expected_window)

  const migration = await sql('113')
  await db.exec(migration)
  await db.exec(migration) // Re-running moves nothing twice and keeps the first backup.

  assert.deepEqual(await months(1), NEW)
  assert.deepEqual(await months(2), ['1:2026-10', ...NEW.slice(1)], 'a dispatched pack keeps its recorded month')
  assert.deepEqual(await months(3), NEW.slice(0, 2))

  // Every payment path writes the new schedule from now on.
  await complete(await reserve(7, 'standard'), 7)
  assert.deepEqual(await months(7), NEW)
  await complete(await reserve(4, 'legacy_upgrade'), 4)
  assert.deepEqual(await months(4), NEW)
  await complete(await reserve(3, 'legacy_upgrade'), 3)
  assert.deepEqual(await months(3), NEW)

  for (const column of ['content', 'published_content']) {
    const kyoto = await scalar(`select ${column} from device_batches where slug='kyoto-one'`)
    assert.equal(kyoto.estimatedCompletion, 'Estimated final dispatch: February 2027')
    assert.deepEqual(kyoto.distributionStages.map(stage => stage.window), ['December 2026', 'January 2027', 'February 2027', 'Left alone'])
    assert.equal(kyoto.distributionStages[0].summary, 'kept')
    assert.equal(kyoto.name, 'Kyoto One')
  }
  assert.deepEqual(await scalar("select content from device_batches where slug='kamakura-one'"), content)
  assert.deepEqual(await windows(claim), ['Dispatch date not yet confirmed', 'January 2027', 'February 2027'])
  assert.deepEqual(await windows(otherBatch), ['Dispatch date not yet confirmed'])

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    await assert.rejects(() => rows('select public.initiation_pack_month(1)'), /permission denied/)
    await assert.rejects(() => rows('select * from public.s26_dispatch_shift_v113_backup'), /permission denied/)
    await db.exec('reset role')
  }
  await db.exec('set role service_role')
  assert.equal(await scalar('select public.initiation_pack_month(1)'), '2026-12')
  await db.exec('reset role')

  await db.exec(await sql('113.rollback'))
  assert.deepEqual(await months(1), OLD)
  assert.deepEqual(await months(2), OLD)
  assert.deepEqual(await scalar("select content from device_batches where slug='kyoto-one'"), content)
  assert.deepEqual(await scalar("select published_content from device_batches where slug='kyoto-one'"), content)
  assert.deepEqual(await windows(claim), ['Dispatch date not yet confirmed', 'Dispatch date not yet confirmed', 'Dispatch date not yet confirmed'])
  assert.equal(await scalar("select to_regclass('public.s26_dispatch_shift_v113_backup')"), null)
  console.log('s26 dispatch shift v113 passed')
} finally {
  await db.close()
}
