// Disposable PostgreSQL/WASM only. No network, environment, or real accounts.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const user = '11000000-0000-0000-0000-000000000001'
const other = '11000000-0000-0000-0000-000000000002'
const missing = '11000000-0000-0000-0000-000000000003'
const order = '22000000-0000-0000-0000-000000000001'
const rows = async (sql, args=[]) => (await db.query(sql,args)).rows
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; grant usage on schema auth to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text);
    create table voyager_profiles(id uuid primary key,registered_at timestamptz);
    create table initiation_orders(id uuid primary key,user_id uuid,status text,stripe_session_id text,
      meta_attribution jsonb default '{}',analytics_context jsonb default '{}');
    grant select,update on initiation_orders to service_role;`)
  await db.exec(await fs.readFile(new URL('../schema_v109.sql',import.meta.url),'utf8'))
  await rows("insert into auth.users values($1,'buyer@example.com'),($2,'Mixed@Example.com'),($3,'missing-profile@example.com')",[user,other,missing])
  await rows('insert into voyager_profiles values($1,now()),($2,null)',[user,other])
  await rows("insert into initiation_orders(id,user_id,status) values($1,$2,'pending')",[order,user])
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`)
    await assert.rejects(rows("select * from public.find_activation_account('buyer@example.com')"), /permission denied/)
    await assert.rejects(rows("select * from putopia_private.find_activation_account('buyer@example.com')"), /permission denied/)
    await assert.rejects(rows('select public.save_initiation_checkout_attribution($1,$2,$3,$4)',[order,user,{},{}]), /permission denied/)
    await db.exec('reset role')
  }
  await db.exec('set role service_role')
  await assert.rejects(rows('select * from auth.users'), /permission denied/)
  assert.deepEqual(await rows("select * from find_activation_account(' BUYER@EXAMPLE.COM ')"),[{id:user,activated:true}])
  assert.deepEqual(await rows("select * from find_activation_account('mixed@example.com')"),[{id:other,activated:false}])
  assert.deepEqual(await rows("select * from find_activation_account('missing-profile@example.com')"),[{id:missing,activated:false}])
  for (const email of [null,'',' ','not-found@example.com']) assert.deepEqual(await rows('select * from find_activation_account($1)',[email]),[])
  const save = (owner,meta,analytics) => rows('select save_initiation_checkout_attribution($1,$2,$3,$4)',[order,owner,meta,analytics])
  await assert.rejects(save(other,{bad:true},{bad:true}), /reservation is unavailable/)
  await assert.rejects(save(user,{first:true},[]), /must be an object/)
  assert.deepEqual((await rows('select meta_attribution,analytics_context from initiation_orders'))[0],{meta_attribution:{},analytics_context:{}})
  await save(user,{first:'meta'},{first:'analytics'})
  await save(user,{second:'meta'},{second:'analytics'})
  assert.deepEqual((await rows('select meta_attribution,analytics_context from initiation_orders'))[0],{meta_attribution:{first:'meta'},analytics_context:{first:'analytics'}})
  // Preserve each field independently, including a partially saved pre-migration order.
  await rows("update initiation_orders set analytics_context='{}' where id=$1",[order])
  await save(user,{second:'meta'},{recovered:true})
  assert.deepEqual((await rows('select meta_attribution,analytics_context from initiation_orders'))[0],{meta_attribution:{first:'meta'},analytics_context:{recovered:true}})
  // A concurrent creator already bound the same order; neither context can be overwritten.
  await rows("update initiation_orders set stripe_session_id='cs_fixture' where id=$1",[order])
  await save(user,{bad:true},{bad:true})
  assert.deepEqual((await rows('select analytics_context from initiation_orders'))[0].analytics_context,{recovered:true})
  for(const status of ['paid','canceled','payment_review','disputed']) {
    await rows('update initiation_orders set status=$1 where id=$2',[status,order])
    await assert.rejects(save(user,{bad:true},{bad:true}), /reservation is unavailable/)
  }
  await db.exec('reset role')
  await rows("insert into auth.users values(gen_random_uuid(),'BUYER@example.com')")
  await db.exec('set role service_role')
  assert.equal((await rows("select * from find_activation_account('buyer@example.com')")).length,2)
  console.log('v109 passed: server-only ACLs, bounded/case-insensitive/missing-profile/ambiguous lookup, atomic first-touch writes, ownership, race, and paid/review guards')
} finally { await db.close() }
