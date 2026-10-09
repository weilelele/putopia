// Isolated, in-memory PostgreSQL only. Pass an installed @electric-sql/pglite
// module entry path as argv[2]. No environment files, credentials or networking.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table voyager_profiles(id uuid primary key,role text,account_kind text);
create table devices(id uuid primary key default gen_random_uuid(),current_user_id uuid);
create table device_batches(id uuid primary key default gen_random_uuid(),slug text unique,code text,publication_status text,listing_quantity int,claimed_quantity int default 0,reserved_quantity int default 0,updated_at timestamptz);
create table initiation_batches(label text primary key,console_batch_slug text);
create table initiation_orders(id uuid primary key,user_id uuid,status text,shipping jsonb);
create table voyager_orders(id uuid primary key default gen_random_uuid(),user_id uuid,product_type text,status text,amount int,currency text,batch_label text,device_batch_slug text,device_batch_code text,pack_count int,recipient_name text,address_line1 text,address_line2 text,city text,state text,postal_code text,country text,tracking_url text,shipped_at timestamptz,delivered_at timestamptz);
create table initiation_entitlements(user_id uuid primary key,order_id uuid unique,batch text default 'S26',active boolean default true,console_claimed_at timestamptz,console_order_id uuid unique);
create table initiation_shipments(id uuid primary key default gen_random_uuid(),user_id uuid,order_id uuid,position int,legacy_order_id uuid,status text default 'planned',tracking_url text,unique(order_id,position));
create table device_batch_units(id bigint generated always as identity primary key,batch_slug text,sequence_no int,unit_code text unique,status text default 'available',order_id uuid unique,user_id uuid,assigned_at timestamptz,updated_at timestamptz,shipping_verified_at timestamptz,shipping_verified_by uuid,shipped_at timestamptz,delivered_at timestamptz);
create table device_order_packs(id int);
insert into initiation_batches values('S26',null);
insert into device_batches(slug,code,publication_status,listing_quantity) values('test-one','TEST','published',1),('other','OTHER','published',1);
insert into device_batch_units(batch_slug,sequence_no,unit_code) values('test-one',1,'TEST-001'),('other',1,'OTHER-001');
`)
await db.exec(`create function eligible_legacy_initiation_order(p_user uuid) returns uuid language sql as 'select null::uuid';`)
const v90 = await readFile(new URL('../../supabase/schema_v90.sql',import.meta.url),'utf8')
const generic = v90.slice(v90.indexOf('create or replace function public.fulfill_initiation_shipment('), v90.indexOf('revoke all on function public.eligible_legacy_initiation_order'))
await db.exec(generic)
await db.exec(await readFile(new URL('../../supabase/schema_v88.sql',import.meta.url),'utf8'))
const actor='00000000-0000-0000-0000-000000000001', member='00000000-0000-0000-0000-000000000002', unpaid='00000000-0000-0000-0000-000000000003', second='00000000-0000-0000-0000-000000000004', npc='00000000-0000-0000-0000-000000000005'
await db.query(`insert into voyager_profiles values($1,'architect','human'),($2,'voyager','human'),($3,'voyager','human'),($4,'voyager','human'),($5,'architect','npc')`,[actor,member,unpaid,second,npc])
for(const user of [member,second]) {
 await db.query(`insert into initiation_orders values($1,$1,'paid','{"name":"Test Member","address":{"line1":"Fixture Lane","country":"US"}}');`,[user])
 await db.query('insert into initiation_entitlements(user_id,order_id) values($1,$1)',[user])
 await db.query('insert into initiation_shipments(user_id,order_id,position) select $1,$1,n from generate_series(1,4)n',[user])
}
let cases=0
async function rejects(sql,params,code) {await assert.rejects(db.query(sql,params),e=>!code||e.code===code);cases++}
async function value(sql,params=[]) {return (await db.query(sql,params)).rows[0].v}
assert.equal((await value("select device_claim_supply('test-one') v")).status,'unconfigured');cases++
await rejects('select claim_initiation_console($1,$2)',[member,'test-one'],'P1003')
await rejects('select claim_initiation_console($1,$2)',[unpaid,'test-one'],'P1001')
await rejects("select configure_device_supply($1,'S26','test-one',0,'Approved isolated fixture')",[npc])
await db.query("select configure_device_supply($1,'S26','test-one',0,'Approved isolated fixture')",[actor])
await rejects("select configure_device_supply($1,'S26','other',0,'Stale approval fixture')",[actor])
await rejects('select claim_initiation_console($1,$2)',[member,'other'],'P1003')
await db.query("update initiation_orders set shipping='{}' where user_id=$1",[member])
await rejects('select claim_initiation_console($1,$2)',[member,'test-one'],'P1003')
await db.query(`update initiation_orders set shipping='{"name":"Test Member","address":{"line1":"Fixture Lane","country":"US"}}' where user_id=$1`,[member])
const result=await value('select claim_initiation_console($1,$2) v',[member,'test-one'])
assert.equal(result.unitCode,'TEST-001');cases++
assert.equal(await value('select has_bound_console($1) v',[member]),true);cases++
assert.equal(await value('select has_bound_console($1) v',[unpaid]),false);cases++
const again=await value('select claim_initiation_console($1,$2) v',[member,'test-one'])
assert.equal(again.orderId,result.orderId);assert.equal(again.already,true);cases++
assert.equal(await value("select count(*)::int v from voyager_orders"),1);cases++
assert.equal(await value("select count(*)::int v from device_order_packs"),0);cases++
assert.equal(await value('select recipient_name v from voyager_orders where id=$1',[result.orderId]),'Test Member');cases++
await rejects('select claim_initiation_console($1,$2)',[second,'test-one'],'P1002')
assert.equal(await value('select console_order_id is null v from initiation_entitlements where user_id=$1',[second]),true);cases++
const shipment=await value('select id v from initiation_shipments where user_id=$1 and position=3',[member])
await rejects("select fulfill_initiation_shipment($1,$2,'preparing',null)",[actor,shipment])
await rejects("select fulfill_initiation_console($1,$2,'preparing','WRONG',null)",[actor,result.orderId])
await db.query("select fulfill_initiation_console($1,$2,'preparing','TEST-001',null)",[actor,result.orderId])
await rejects("select fulfill_initiation_console($1,$2,'shipped','TEST-001',null)",[actor,result.orderId])
await db.query("select fulfill_initiation_console($1,$2,'shipped','TEST-001','https://tracking.example/test')",[actor,result.orderId])
await db.query("select fulfill_initiation_console($1,$2,'shipped','TEST-001','https://tracking.example/test')",[actor,result.orderId])
assert.equal(await value('select status v from initiation_shipments where id=$1',[shipment]),'dispatched');cases++
await rejects("select fulfill_initiation_console($1,$2,'shipped','TEST-001','https://tracking.example/second')",[actor,result.orderId])
await db.query("select fulfill_initiation_console($1,$2,'delivered','TEST-001',null)",[actor,result.orderId])
assert.equal(await value('select count(*)::int v from initiation_shipments where user_id=$1',[member]),4);cases++
assert.equal(await value('select status v from device_batch_units where order_id=$1',[result.orderId]),'delivered');cases++
await db.query('update initiation_entitlements set active=false where user_id=$1',[member])
assert.equal(await value('select has_bound_console($1) v',[member]),false);cases++
await rejects('select claim_initiation_console($1,$2)',[member,'test-one'],'P1001')
await rejects("select fulfill_initiation_console($1,$2,'delivered','TEST-001',null)",[actor,result.orderId])
assert.equal(await value("select has_function_privilege('authenticated','public.claim_initiation_console(uuid,text)','EXECUTE') v"),false);cases++
// Legacy hardware bindings still establish holder access without an Initiation order.
await db.query('insert into devices(current_user_id) values($1)',[unpaid])
assert.equal(await value('select has_bound_console($1) v',[unpaid]),true);cases++
// Exercise A's preserved legacy first-two-Pack branch after v88 has been applied.
await db.exec(`create or replace function eligible_legacy_initiation_order(p_user uuid) returns uuid language sql as 'select p_user';`)
await db.query('insert into initiation_shipments(user_id,legacy_order_id,position) values($1,$1,1)',[unpaid])
const oldPack=await value('select id v from initiation_shipments where user_id=$1 and position=1',[unpaid])
await db.query("select fulfill_initiation_shipment($1,$2,'preparing',null)",[actor,oldPack])
await db.query("select fulfill_initiation_shipment($1,$2,'dispatched','https://tracking.example/legacy')",[actor,oldPack])
assert.equal(await value('select status v from initiation_shipments where id=$1',[oldPack]),'dispatched');cases++
assert.equal(await value('select console_order_id is null v from initiation_entitlements where user_id=$1',[second]),true);cases++
assert.equal(await value("select count(*)::int v from device_supply_audit"),1);cases++
assert.equal(await value("select has_function_privilege('anon','public.configure_device_supply(uuid,text,text,integer,text)','EXECUTE') v"),false);cases++
console.log(`v88 isolated PostgreSQL checks passed: ${cases}`)
await db.close()
