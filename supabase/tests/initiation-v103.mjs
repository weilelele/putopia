// Isolated PostgreSQL/WASM verification. No network, env or production services.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
process.on('uncaughtException', error => { console.error(error.message, error.position ?? '', error.where ?? ''); process.exit(1) })
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
for (const match of [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)) await db.exec(match[1])
for (const version of [83,85,90,87,88,89,91,94,97,102,103]) {
  if (version === 103) await db.exec(`
    create table public.voyager_feed_entries(id uuid primary key default gen_random_uuid(),author_id uuid,parent_id uuid,body text);
    alter table public.voyager_feed_entries enable row level security;
    grant select,insert on public.voyager_feed_entries to authenticated;
    create policy feed_fixture_select on public.voyager_feed_entries for select to authenticated using(true);
    create policy feed_fixture_insert on public.voyager_feed_entries for insert to authenticated with check(author_id=auth.uid());
  `)
  const filename = ({83:'schema_v83_initiation.sql',85:'schema_v85_initiation_roster.sql',87:'schema_v87_npc_initiation.sql'})[version] ?? `schema_v${version}.sql`
  await db.exec(await fs.readFile(new URL(`../${filename}`,import.meta.url),'utf8'))
}
const uid = n => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`
const query = async (sql,params=[]) => (await db.query(sql,params)).rows
const scalar = async (sql,params=[]) => Object.values((await query(sql,params))[0])[0]
const person = async n => { await query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')",[uid(n)]); await query("insert into voyager_intake values($1,'voyager-profile-v1')",[uid(n)]) }
const reserve = (n,kind) => scalar('select reserve_initiation($1,$2,$3,$4)',[uid(n),`price_${kind}`,'prod_init',kind])
const shipping={name:'Test',address:{line1:'1 Local Street',country:'US'}}
const complete=(o,n)=>query('select complete_initiation($1,$2,$3,$4,$5)',[o.id,`cs_test_${o.id}`,uid(n),`pi_${o.id}`,shipping])
const post=async n=>{await db.exec(`set role authenticated;select set_config('request.uid','${uid(n)}',false)`);try{return await query('insert into voyager_feed_entries(author_id,body) values($1,$2)',[uid(n),'Fixture post'])}finally{await db.exec('reset role')}}
await db.exec('update initiation_batches set checkout_open=true')
for (const n of [1,2,3,4,5]) await person(n)
const initial=await reserve(1,'initial'); assert.equal(initial.amount,4800)
assert.equal((await reserve(1,'initial')).id,initial.id)
await assert.rejects(()=>reserve(1,'standard'),/reconciliation/)
await complete(initial,1); await complete(initial,1)
assert.equal(await scalar('select count(*)::int from initiation_entitlements'),0)
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid(1)]),2)
assert.equal(await scalar('select membership_private.access_role_for($1)',[uid(1)]),'voyager')
assert.equal((await scalar('select initiation_access_state($1)',[uid(1)])).formal,true)
await post(1)
await assert.rejects(()=>reserve(1,'legacy_upgrade'),/eligibility|reconciliation/)
await assert.rejects(()=>reserve(2,'initial_upgrade'),/paid active/)
const upgrade=await reserve(1,'initial_upgrade'); assert.equal(upgrade.amount,50000)
assert.equal(await scalar('select initiation_occupied_seats()'),1)
await complete(upgrade,1); await complete(upgrade,1)
assert.equal(await scalar('select initiation_occupied_seats()'),1)
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid(1)]),4)
assert.equal(await scalar('select order_id from initiation_members where user_id=$1',[uid(1)]),initial.id)
await query('select record_initiation_refund($1,50000,50000)',[`pi_${upgrade.id}`])
assert.equal(await scalar('select active from initiation_entitlements where user_id=$1',[uid(1)]),false)
assert.equal(await scalar('select membership_private.access_role_for($1)',[uid(1)]),'voyager')
assert.equal((await scalar('select initiation_access_state($1)',[uid(1)])).formal,true)
await post(1)
const full=await reserve(2,'standard'); assert.equal(full.amount,52000); await complete(full,2)
await query("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),'cs_live_legacy','pi_legacy')",[uid(3)])
const legacy=await reserve(3,'legacy_upgrade'); assert.equal(legacy.amount,40000); await complete(legacy,3)
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid(3)]),4)
await assert.rejects(()=>reserve(3,'initial'),/Historical/)
const pendingInitial=await reserve(4,'initial'); await complete(pendingInitial,4)
const pendingUpgrade=await reserve(4,'initial_upgrade')
await query('select record_initiation_refund($1,4800,4800)',[`pi_${pendingInitial.id}`])
await complete(pendingUpgrade,4)
assert.equal(await scalar('select status from initiation_orders where id=$1',[pendingUpgrade.id]),'payment_review')
assert.equal(await scalar('select count(*)::int from initiation_entitlements where user_id=$1',[uid(4)]),0)
assert.equal(await scalar('select membership_private.access_role_for($1)',[uid(4)]),'applicant')
await assert.rejects(()=>post(4),/row-level security/)
// A refund of Initial after upgrade completion freezes the dependent Console.
const base5=await reserve(5,'initial');await complete(base5,5)
const top5=await reserve(5,'initial_upgrade');await complete(top5,5)
await query('select hold_initiation_payment($1,$2)',[`pi_${base5.id}`,'disputed'])
assert.equal(await scalar('select active from initiation_entitlements where user_id=$1',[uid(5)]),false)
assert.equal(await scalar('select status from initiation_orders where id=$1',[top5.id]),'payment_review')
// No paid-event duplication on repeated completion; old and new orders enqueue.
assert.equal(await scalar("select count(*)::int from initiation_meta_purchases where order_id=$1",[initial.id]),1)
assert.equal(await scalar("select count(*)::int from initiation_analytics_outbox where order_id=$1 and event='initiation_purchase_completed'",[full.id]),1)
// Existing Initial buyers may upgrade at full cohort capacity; new seats may not.
await person(6);await person(7)
const base6=await reserve(6,'initial');await complete(base6,6)
const remaining=100-Number(await scalar('select initiation_occupied_seats()'))
for(let n=1000;n<1000+remaining;n++){
 await person(n)
 await query("insert into initiation_members(user_id,source,grant_note) values($1,'granted','Isolated capacity fixture')",[uid(n)])
}
assert.equal(await scalar('select initiation_occupied_seats()'),100)
await assert.rejects(()=>reserve(7,'initial'),/fully reserved/)
const top6=await reserve(6,'initial_upgrade');await complete(top6,6)
assert.equal(await scalar('select initiation_occupied_seats()'),100)
await db.exec('set role authenticated')
await assert.rejects(()=>query('select eligible_initial_initiation_order($1)',[uid(1)]),/permission denied/)
await assert.rejects(()=>query("select reserve_initiation($1,'price_initial','prod_init','initial')",[uid(1)]),/permission denied/)
await db.exec('reset role')
await db.close()
console.log('v103 SQL passed: four offers, dependencies, refunds, idempotency, seats, outboxes and service-only access.')
