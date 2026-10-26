// Disposable in-memory PostgreSQL. Explicit PGlite path; no env, network or live payments.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  for (const block of blocks) await db.exec(block[1])
  for (const name of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105']) {
    await db.exec(await fs.readFile(new URL(`../schema_v${name}.sql`, import.meta.url), 'utf8'))
  }
  const rows = async (sql, params = []) => (await db.query(sql, params)).rows
  const scalar = async (sql, params = []) => Object.values((await rows(sql, params))[0])[0]
  const uid = n => `33000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const reserve = (n, kind) => scalar('select reserve_initiation_v2($1,$2,$3,$4,null)', [uid(n), `price_${kind}`, 'prod_fixture', kind])
  const shipping = { name: 'Isolated Fixture', address: { line1: '1 Fixture', country: 'US', state: 'CA' } }
  const complete = o => rows('select complete_initiation($1,$2,$3,$4,$5)', [o.id, `cs_fixture_${o.id}`, o.user_id, `pi_fixture_${o.id}`, shipping])
  for (let n = 1; n <= 7; n++) await rows("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [uid(n)])
  await assert.rejects(() => reserve(1, 'initial'), /closed/)
  await db.exec('update initiation_batches set checkout_open=true')
  const initial = await reserve(1, 'initial')
  assert.equal(initial.amount, 3800)
  assert.equal((await reserve(1, 'initial')).id, initial.id)
  await assert.rejects(() => reserve(1, 'standard'), /reconciliation/)
  await complete(initial); await complete(initial)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [uid(1)]), 'voyager')
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [uid(1)]), 2)
  const standard = await reserve(2, 'standard')
  assert.equal(standard.amount, 48800)
  await complete(standard)
  assert.equal(await scalar('select active from initiation_entitlements where user_id=$1', [uid(2)]), true)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [uid(2)]), 4)
  await rows("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),'cs_live_fixture_old12','pi_fixture_old12')", [uid(3)])
  const legacy = await reserve(3, 'legacy_upgrade')
  assert.equal(legacy.amount, 46000)
  await complete(legacy)
  assert.equal(await scalar('select active from initiation_entitlements where user_id=$1', [uid(3)]), true)
  // No answer rows have been required or fabricated for any buyer.
  assert.equal(await scalar('select count(*)::int from voyager_intake'), 0)
  await assert.rejects(() => reserve(4, 'legacy_upgrade'), /eligibility/)
  await rows("update voyager_profiles set account_kind='npc' where id=$1", [uid(5)])
  await assert.rejects(() => reserve(5, 'initial'), /human/)
  await db.exec(`insert into voyager_profiles(id,role,account_kind,member_source,batch_label)
    select ('44000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'voyager','human','granted','S26'
    from generate_series(1,100-(select public.initiation_occupied_seats())::int) n;
    insert into initiation_members(user_id,source,grant_note)
    select id,'granted','Isolated capacity fixture' from voyager_profiles where id::text like '44000000-%';`)
  await assert.rejects(() => reserve(6, 'initial'), /fully reserved/)
  const upgrade = await reserve(1, 'legacy_upgrade')
  assert.equal(upgrade.amount, 46000)
  await complete(upgrade)
  assert.equal(await scalar('select initiation_occupied_seats()'), 100)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [uid(1)]), 4)
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.reserve_initiation_v2(uuid,text,text,text,text)','execute')", [role]), false)
  }
  assert.equal(await scalar("select has_function_privilege('service_role','public.reserve_initiation_v2(uuid,text,text,text,text)','execute')"), true)
  console.log('v105 passed: uncalibrated Initial/Complete/legacy purchases, immediate entitlements, idempotency, capacity, upgrades and ACLs')
} finally { await db.close() }
