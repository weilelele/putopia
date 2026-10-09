// Isolated PostgreSQL/WASM test; accepts an explicitly installed PGlite module path.
// No network, production config, real identities or repository dependencies used.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email','test@example.com')$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create type user_role as enum ('guest','applicant','voyager','architect');
create sequence voyager_member_no_seq;
create table voyager_profiles(id uuid primary key,display_name text,role user_role,account_kind text,member_source text,member_no integer,member_since timestamptz,batch_label text,bio text,avatar_url text,location text);
create table batches(label text primary key);
create table devices(id uuid primary key default gen_random_uuid(),current_user_id uuid);
create table voyager_intake(user_id uuid primary key,version text);
create table device_batches(id uuid primary key default gen_random_uuid(),slug text unique,code text,publication_status text,claimed_quantity int default 0,reserved_quantity int default 0,listing_quantity int,updated_at timestamptz);
create table voyager_orders(id uuid primary key default gen_random_uuid(),user_id uuid,product_type text,status text,amount int,currency text,paid_at timestamptz,stripe_session_id text,stripe_payment_intent text,batch_label text,device_batch_slug text,device_batch_code text,pack_count int default 1 check(pack_count>0),recipient_name text,address_line1 text,address_line2 text,city text,state text,postal_code text,country text,tracking_url text,tracking_number text,shipped_at timestamptz,delivered_at timestamptz);
alter table voyager_orders rename constraint voyager_orders_pack_count_check to voyager_orders_pack_count_positive;
create table device_order_packs(id uuid primary key default gen_random_uuid(),order_id uuid,status text);
create table device_batch_units(id bigint generated always as identity primary key,batch_slug text,sequence_no int,unit_code text,status text,order_id uuid,user_id uuid,assigned_at timestamptz,updated_at timestamptz,shipping_verified_at timestamptz,shipping_verified_by uuid,shipped_at timestamptz,delivered_at timestamptz);
`)
await db.exec(`
alter table voyager_profiles add column email text, add column social_x text, add column social_instagram text, add column social_linkedin text,
 add column registered_at timestamptz, add column updated_at timestamptz default now(), add column experiment_group text,
 add column can_edit_onboarding boolean default false, add column observation_days int not null default 0, add column worlds_discovered int not null default 0;
alter table voyager_profiles enable row level security;
create policy profiles_read on voyager_profiles for select using(true);
create policy profiles_update on voyager_profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy profiles_insert on voyager_profiles for insert with check(id=auth.uid());
create function public.provision_voyager(uuid) returns void language sql as $$select$$;
create table intel(id text primary key,classified boolean,content text);
alter table intel enable row level security;
create policy intel_select_public on intel for select using(not classified);
create policy intel_select_voyager on intel for select using(exists(select 1 from voyager_profiles where id=auth.uid() and role in ('voyager','architect')));
create table votes(id uuid primary key,is_active boolean not null,ends_at timestamptz,scope text[],type text,options jsonb,device_batch_slug text);
alter table votes enable row level security;
create table vote_responses(id uuid default gen_random_uuid(),vote_id uuid,user_id uuid,anon_token text,selected_options text[] not null,voter_name text,unique(vote_id,user_id),unique(vote_id,anon_token));
alter table vote_responses enable row level security;
create policy responses_insert_own on vote_responses for insert with check(user_id=auth.uid() or(user_id is null and anon_token is not null));
grant all on voyager_profiles,intel,votes,vote_responses to anon,authenticated;
`)
for (const version of [83,85,90,87,88,89,91,94]) await db.exec(await fs.readFile(new URL(`../${({83:'schema_v83_initiation.sql',85:'schema_v85_initiation_roster.sql',87:'schema_v87_npc_initiation.sql'})[version] ?? `schema_v${version}.sql`}`,import.meta.url),'utf8'))
assert.equal((await db.query('select count(*)::int as n from initiation_shipments')).rows[0].n,0)
const uid = n => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`
const query = async (sql, params=[]) => (await db.query(sql,params)).rows
const scalar = async (sql, params=[]) => Object.values((await query(sql,params))[0])[0]
const asUser = async (n, sql, params=[]) => {
 await db.exec(`set role authenticated; select set_config('request.uid','${uid(n)}',false);`)
 try { return await query(sql,params) } finally { await db.exec('reset role') }
}
const checkAccess = async (n,role) => assert.equal((await asUser(n,'select effective_access_role() as role'))[0].role,role)
const person = async (n,kind='human') => { await query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant',$2)",[uid(n),kind]); await query("insert into voyager_intake values($1,'voyager-profile-v1')",[uid(n)]) }
const reserve = async (n,kind='standard') => scalar('select reserve_initiation($1,$2,$3,$4,$5)',[uid(n),kind==='standard'?'price_520':'price_400','prod_init',kind,'/devices/batches/kyoto'])
const shipping={name:'Local Test',address:{line1:'1 Test Street',city:'Test',country:'US',postal_code:'00000'}}
const complete=async(o,n,pi='pi_'+n)=>query('select complete_initiation($1,$2,$3,$4,$5)',[o.id,'cs_test_'+n,uid(n),pi,shipping])
await person(1); await person(2); await person(3,'npc'); await person(200)
await query("update voyager_profiles set role='architect' where id=$1",[uid(200)])
await assert.rejects(()=>reserve(1),/closed/)
await db.exec("update initiation_batches set checkout_open=true")
await assert.rejects(()=>reserve(3),/human/)
await query("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),'cs_live_legacy','pi_legacy')",[uid(2)])
assert.ok(await scalar('select eligible_legacy_initiation_order($1)',[uid(2)]))
await checkAccess(1,'applicant'); await checkAccess(2,'voyager'); await checkAccess(200,'architect')
await query("insert into intel values('public',false,'Public'),('private',true,'Secret')")
assert.equal((await asUser(1,'select * from intel')).length,1)
assert.equal((await asUser(2,'select * from intel')).length,2)
await assert.rejects(()=>asUser(1,"update voyager_profiles set role='architect' where id=$1",[uid(1)]),/managed by the server/)
await query("insert into votes values($1,true,null,ARRAY['voyager'],'single','[{\"id\":\"a\"}]'::jsonb,null)",[uid(300)])
await assert.rejects(()=>asUser(1,"insert into vote_responses(vote_id,user_id,selected_options) values($1,$2,ARRAY['a'])",[uid(300),uid(1)]),/scope denied/)
await asUser(2,"insert into vote_responses(vote_id,user_id,selected_options) values($1,$2,ARRAY['a'])",[uid(300),uid(2)])
await query('select ensure_legacy_initiation_packs($1)',[uid(2)])
const oldPacks=await query('select id from initiation_shipments where user_id=$1 order by position',[uid(2)])
assert.equal(oldPacks.length,2)
await assert.rejects(()=>query("update voyager_orders set status='shipped' where user_id=$1",[uid(2)]),/duplicate legacy dispatch/)
await assert.rejects(()=>query("insert into device_order_packs(order_id,status) select id,'shipped' from voyager_orders where user_id=$1",[uid(2)]),/duplicate old Pack/)
await assert.rejects(()=>reserve(2,'standard'),/eligibility/)
const standard=await reserve(1);const upgrade=await reserve(2,'legacy_upgrade')
assert.equal(standard.amount,52000);assert.equal(upgrade.amount,40000)
assert.equal((await reserve(2,'legacy_upgrade')).id,upgrade.id)
await complete(standard,1);await complete(upgrade,2);await complete(upgrade,2)
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid(2)]),4)
assert.deepEqual(await query('select id from initiation_shipments where user_id=$1 and position<3 order by position',[uid(2)]),oldPacks)
assert.equal(await scalar('select count(*)::int from initiation_members'),2)
await checkAccess(1,'voyager'); await checkAccess(2,'voyager')
assert.equal(await scalar('select initiation_occupied_seats()::int'),2)
// Upgrade without a preexisting shipment backfill creates/reuses only four records.
await db.exec('begin')
await person(201)
await query("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),'cs_live_legacy201','pi_legacy201')",[uid(201)])
const freshUpgrade=await reserve(201,'legacy_upgrade')
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid(201)]),0)
await complete(freshUpgrade,201)
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid(201)]),4)
assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1 and order_id is null and legacy_order_id is not null',[uid(201)]),2)
await db.exec('rollback')
// Actual Device v88: one real Unit, reused checkout shipping, Console IS Pack 3.
await query("insert into device_batches(slug,code,publication_status,listing_quantity) values('kyoto','KY','published',1)")
await query("insert into device_batch_units(batch_slug,sequence_no,unit_code,status) values('kyoto',1,'KY-001','available')")
assert.equal(await scalar("select console_batch_slug from initiation_batches where label='S26'"),null)
assert.equal((await scalar("select device_claim_supply('kyoto')")).status,'available')
await assert.rejects(()=>query('select claim_initiation_console($1)',[uid(2)]),/Choose a published/)
await assert.rejects(()=>query("select claim_initiation_console($1,'other')",[uid(2)]),/Choose a published/)
const claim=await scalar("select claim_initiation_console($1,'kyoto')",[uid(2)])
assert.equal((await scalar("select claim_initiation_console($1,'kyoto')",[uid(2)])).orderId,claim.orderId)
assert.equal(await scalar('select recipient_name from voyager_orders where id=$1',[claim.orderId]),shipping.name)
await assert.rejects(()=>query("select claim_initiation_console($1,'kyoto')",[uid(1)]),/capacity/)
assert.equal(await scalar('select console_claimed_at from initiation_entitlements where user_id=$1',[uid(1)]),null)
await query("insert into device_batches(slug,code,publication_status,listing_quantity) values('kamakura','KA','published',1)")
await query("insert into device_batch_units(batch_slug,sequence_no,unit_code,status) values('kamakura',1,'KA-001','available')")
await assert.rejects(()=>query("select claim_initiation_console($1,'kamakura')",[uid(2)]),/another batch/)
await db.exec('begin')
assert.equal((await scalar("select claim_initiation_console($1,'kamakura')",[uid(1)])).unitCode,'KA-001')
await db.exec('rollback')
const consolePack=await scalar('select id from initiation_shipments where user_id=$1 and position=3',[uid(2)])
await assert.rejects(()=>query("select fulfill_initiation_shipment($1,$2,'preparing',null)",[uid(200),consolePack]),/Console is shipment 3/)
await query("select fulfill_initiation_console($1,$2,'preparing','KY-001',null)",[uid(200),claim.orderId])
await assert.rejects(()=>query("select fulfill_initiation_console($1,$2,'shipped','WRONG','https://tracking.test/1')",[uid(200),claim.orderId]),/exact bound/)
await query("select fulfill_initiation_console($1,$2,'shipped','KY-001','https://tracking.test/1')",[uid(200),claim.orderId])
assert.equal(await scalar('select status from initiation_shipments where id=$1',[consolePack]),'dispatched')
assert.equal(await scalar('select has_bound_console($1)',[uid(2)]),false)
await query('insert into devices(current_user_id) values($1)',[uid(2)])
assert.equal(await scalar('select has_bound_console($1)',[uid(2)]),true)
await query('delete from devices where current_user_id=$1',[uid(2)])
assert.equal(await scalar('select count(*)::int from device_order_packs'),0)
assert.equal((await scalar('select initiation_access_state($1)',[uid(2)])).formal,true)
await query("select hold_initiation_payment('pi_2','refunded')")
assert.equal((await scalar('select initiation_access_state($1)',[uid(2)])).formal,false)
assert.equal((await scalar('select initiation_access_state($1)',[uid(2)])).legacy,true)
await checkAccess(2,'voyager')
assert.equal(await scalar('select initiation_occupied_seats()::int'),2)
await query("select hold_initiation_payment('pi_legacy','disputed')")
assert.equal(await scalar('select eligible_legacy_initiation_order($1)',[uid(2)]),null)
await checkAccess(2,'applicant')
assert.equal((await asUser(2,'select * from intel')).length,1)
assert.equal((await scalar('select initiation_access_state($1)',[uid(2)])).refundOrDispute,true)
await assert.rejects(()=>query("select fulfill_initiation_shipment($1,$2,'preparing',null)",[uid(200),oldPacks[0].id]),/Active entitlement/)
// Partial refunds retain digital access, freeze physical rights, and never
// regress when a stale partial event arrives after a full refund or dispute.
await db.exec('begin')
await query("select record_initiation_refund('pi_1',52000,13000)")
await checkAccess(1,'voyager')
assert.equal(await scalar("select status from initiation_orders where stripe_payment_intent='pi_1'"),'payment_review')
assert.equal(await scalar('select active from initiation_entitlements where user_id=$1',[uid(1)]),false)
await query("select record_initiation_refund('pi_1',52000,52000)")
await query("select record_initiation_refund('pi_1',52000,13000)")
await checkAccess(1,'applicant')
await db.exec('rollback')
await db.exec('begin')
await query("select record_initiation_refund('pi_1',52000,13000)")
await query("select hold_initiation_payment('pi_1','disputed')")
await query("select record_initiation_refund('pi_1',52000,13000)")
await checkAccess(1,'applicant')
await db.exec('rollback')
await query("select hold_initiation_payment('pi_1','refunded')")
await checkAccess(1,'applicant')
const standardPack=await scalar('select id from initiation_shipments where user_id=$1 and position=1',[uid(1)])
await assert.rejects(()=>query("select fulfill_initiation_shipment($1,$2,'preparing',null)",[uid(200),standardPack]),/Active entitlement/)
// Reversal-before-success cannot activate membership.
await person(4);const reversed=await reserve(4)
await query("select hold_initiation_payment('pi_4','refunded')")
await complete(reversed,4)
assert.equal(await scalar('select count(*)::int from initiation_members where user_id=$1',[uid(4)]),0)
// Seats include explicit grants, not merely profiles/NPC roles.
await db.exec('begin')
await query("update voyager_profiles set role='voyager',member_source='granted',batch_label='S26' where id=$1",[uid(3)])
await query('select grant_initiation_member($1,$2)',[uid(3),'isolated grant'])
await query('select grant_initiation_member($1,$2)',[uid(3),'isolated duplicate'])
await db.exec('commit')
assert.equal(await scalar('select initiation_occupied_seats()::int'),4)
for(let i=5;i<=100;i++){await person(i);await reserve(i)}
assert.equal(await scalar('select initiation_occupied_seats()::int'),100)
await person(101);await assert.rejects(()=>reserve(101),/fully reserved/)
await query("update initiation_orders set status='canceled' where user_id=$1",[uid(100)])
await reserve(101)
assert.equal(await scalar('select initiation_occupied_seats()::int'),100)
assert.equal(await scalar("select has_function_privilege('authenticated','reserve_initiation(uuid,text,text,text,text)','execute')"),false)
assert.equal(await scalar("select has_function_privilege('anon','eligible_legacy_initiation_order(uuid)','execute')"),false)
assert.equal(await scalar("select has_function_privilege('authenticated','record_initiation_refund(text,integer,integer)','execute')"),false)
console.log('PASS: v94 receipt binding + partial/full/stale/disputed refund access;  complete v83/v85/v90/v87/v88/v89/v91 SQL files + digital access, profile mutation and vote/Intel RLS + Device third-Pack exact-Unit workflow, legacy eligibility, two prices, idempotent four-Pack reuse, reversal handling, 100-seat cap, cancellation release, service-only ACLs')
await db.close()
