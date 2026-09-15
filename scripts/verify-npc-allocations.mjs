/** Offline SQL integration verification; intentionally outside Vitest.
 * npm install --prefix /tmp/putopia-npc-verification --ignore-scripts @electric-sql/pglite@0.3.14
 * node scripts/verify-npc-allocations.mjs /tmp/putopia-npc-verification/node_modules/@electric-sql/pglite/dist/index.js
 * Creates an in-memory database only; never reads env or connects to services.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const sql = async (file) => readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8')
const v59 = await sql('schema_v59.sql')
const v61 = await sql('schema_v61.sql')
const v64 = await sql('schema_v64.sql')
const v71 = await sql('schema_v71.sql')
function functionSql(source, name) {
  const start = source.indexOf(`create or replace function public.${name}()`)
  assert.ok(start >= 0)
  return source.slice(start, source.indexOf('$$;', start) + 3)
}
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', banned_until timestamptz, updated_at timestamptz);
  create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id));
  create type public.user_role as enum ('guest', 'applicant', 'voyager', 'architect');
  create table public.voyager_profiles (id uuid primary key references auth.users(id), display_name text, role public.user_role, email text, experiment_group text);
  create table public.voyager_orders (id uuid primary key, user_id uuid references auth.users(id), product_type text, device_batch_slug text, status text);
  create table public.comments (id uuid primary key default gen_random_uuid(), author_id uuid, posted_by_id uuid, subject_type text, subject_id text, body text);
`)
await db.exec(v59.slice(v59.indexOf('create table'), v59.indexOf('create table if not exists public.device_batch_versions')))
await db.exec(v64.slice(v64.indexOf('create table'), v64.indexOf('create table if not exists public.device_batch_unit_events')))
await db.exec(functionSql(v61, 'manage_device_batch_inventory'))
await db.exec(functionSql(v64, 'manage_device_order_unit_binding'))
await db.exec(`
  create trigger inventory_insert before insert on public.voyager_orders for each row execute function public.manage_device_batch_inventory();
  create trigger inventory_update before update of status on public.voyager_orders for each row execute function public.manage_device_batch_inventory();
  create trigger unit_insert after insert on public.voyager_orders for each row execute function public.manage_device_order_unit_binding();
  create trigger zz_unit_update before update of status on public.voyager_orders for each row execute function public.manage_device_order_unit_binding();
`)
await db.exec(v71)
await db.exec(`
  create trigger auth_profile after insert on auth.users for each row execute function public.handle_new_user();
  create trigger pool after insert or update of listing_quantity, code on public.device_batches for each row execute function public.sync_device_batch_unit_pool();
  grant usage on schema public to service_role, authenticated;
  grant all on all tables in schema public to service_role;
  grant usage, select on all sequences in schema public to service_role;
  grant select, update on public.voyager_profiles to authenticated;
`)
const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-0000-0000-00000000000${i + 1}`)
const [architect, human, npc, npc2, spoof] = ids
for (const [i, id] of ids.entries()) {
  await db.query('insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values ($1,$2,$3,$4)', [id, `${i}@npc.invalid`, i === 2 || i === 3 ? { account_kind: 'npc' } : {}, { display_name: `User ${i}`, account_kind: 'npc' }])
}
await db.query("update public.voyager_profiles set role='architect' where id=$1", [architect])
assert.equal((await db.query('select account_kind from public.voyager_profiles where id=$1', [spoof])).rows[0].account_kind, 'human')
assert.deepEqual((await db.query('select role,email,experiment_group from public.voyager_profiles where id=$1', [npc])).rows[0], { role: 'guest', email: null, experiment_group: null })
await db.exec("insert into public.device_batches(slug,code,name,publication_status,device_status,listing_quantity,content) values ('one','ONE','One','published','claim_open',2,'{}'),('other','OTHER','Other','published','claim_open',1,'{}')")
await db.exec('set role service_role')
const allocate = (actor, user, batch = 'one', enabled = true) => db.query('select public.set_npc_device_allocation($1,$2,$3,$4) as code', [actor, user, batch, enabled])
const counts = async () => (await db.query("select claimed_quantity, reserved_quantity, allocated_quantity from public.device_batches where slug='one'")).rows[0]
await assert.rejects(allocate(human, npc), /Architect permission/)
await assert.rejects(allocate(architect, human), /NPC not found/)
assert.equal((await allocate(architect, npc)).rows[0].code, 'ONE-001')
assert.equal((await allocate(architect, npc)).rows[0].code, 'ONE-001')
assert.deepEqual(await counts(), { claimed_quantity: 1, reserved_quantity: 0, allocated_quantity: 1 })
const order = '10000000-0000-0000-0000-000000000001'
await db.query("insert into public.voyager_orders values ($1,$2,'device_batch_claim','one','pending')", [order, human])
await assert.rejects(allocate(architect, npc2), /No devices available/)
assert.deepEqual(await counts(), { claimed_quantity: 1, reserved_quantity: 1, allocated_quantity: 1 })
await db.query("update public.voyager_orders set status='paid' where id=$1", [order])
assert.deepEqual(await counts(), { claimed_quantity: 2, reserved_quantity: 0, allocated_quantity: 1 })
// Pool refresh must not reset/rebind an NPC Unit.
await db.exec("update public.device_batches set listing_quantity=2 where slug='one'")
await assert.rejects(db.exec("update public.device_batches set code='CHANGED' where slug='one'"), /cannot change/)
const comment = (actor, batch = 'one') => db.query("insert into public.comments(author_id,posted_by_id,subject_type,subject_id,body) values ($1,$2,'device_batch',$3,'NPC reply')", [npc, actor, batch])
await comment(architect)
await assert.rejects(comment(human), /administrator/)
await assert.rejects(comment(architect, 'other'), /must hold/)
await allocate(architect, npc, 'one', false)
await allocate(architect, npc, 'one', false)
assert.deepEqual(await counts(), { claimed_quantity: 1, reserved_quantity: 0, allocated_quantity: 0 })
await assert.rejects(comment(architect), /must hold/)
assert.equal((await allocate(architect, npc2)).rows[0].code, 'ONE-001')
await db.query("update public.voyager_orders set status='refunded' where id=$1", [order])
assert.deepEqual(await counts(), { claimed_quantity: 1, reserved_quantity: 0, allocated_quantity: 1 })
// Full allocation and a new checkout compete for the same capacity.
await allocate(architect, npc)
await assert.rejects(db.query("insert into public.voyager_orders values ($1,$2,'device_batch_claim','one','pending')", ['10000000-0000-0000-0000-000000000002', human]), /fully claimed/)
assert.equal((await db.query('select count(*)::int as count from public.voyager_orders')).rows[0].count, 1)
assert.equal((await db.query("select count(*)::int as count from public.device_batch_allocations where status='released' and released_by=$1", [architect])).rows[0].count, 1)
await db.exec('reset role; set role authenticated')
await assert.rejects(allocate(architect, npc), /permission denied/)
await assert.rejects(db.query("update public.voyager_profiles set account_kind='npc' where id=$1", [human]), /managed by administrators/)
await assert.rejects(db.query("update public.voyager_profiles set display_name='spoof' where id=$1", [npc]), /managed by administrators/)
await db.exec('reset role; set role anon')
await assert.rejects(allocate(architect, npc), /permission denied/)
// Verify the reviewed legacy import against the same fresh offline database.
await db.exec('reset role')
const v73 = await sql('schema_v73.sql')
const legacy = [...v73.matchAll(/\('([0-9a-f-]{36})'::uuid, '([^']+)'\)/g)].map((match) => [match[1], match[2]])
assert.equal(legacy.length, 10)
for (const [id, email] of legacy) {
  await db.query('insert into auth.users(id,email) values ($1,$2)', [id,email])
  await db.query("update public.voyager_profiles set role='voyager' where id=$1", [id])
}
const beforeImport = await counts()
await db.query('insert into auth.sessions(user_id) values ($1)', [legacy[0][0]])
await assert.rejects(db.exec(v73), /Legacy NPC has sessions/)
await db.exec('rollback')
await db.query('delete from auth.sessions where user_id=$1', [legacy[0][0]])
await db.exec(v73)
assert.deepEqual(await counts(), beforeImport)
assert.equal((await db.query('select count(*)::int as n from public.npc_legacy_imports')).rows[0].n, 10)
assert.equal((await db.query("select count(*)::int as n from public.voyager_profiles p join public.npc_legacy_imports i on i.user_id=p.id join auth.users u on u.id=p.id where p.account_kind='npc' and p.role='voyager' and p.email=u.email and u.banned_until is null and not (u.raw_app_meta_data ? 'account_kind')")).rows[0].n, 10)
await assert.rejects(db.query("update public.voyager_profiles set account_kind='human' where id=$1", [legacy[0][0]]), /cannot be changed/)
console.log('Legacy NPC import passed: 10 exact identities, active-session abort, preserved roles/IDs/email/login settings, before-state audit and unchanged inventory.')
await db.close()
console.log('NPC SQL verification passed: Auth metadata, authorization, idempotent allocate/release, checkout capacity, payment/refund transitions, pool preservation, comment ownership, audit and RLS grants.')
