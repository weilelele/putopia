/** Offline regression: node scripts/verify-npc-creation.mjs /path/to/pglite/dist/index.js
 * Uses an in-memory database only; no environment variables or remote services.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const v71 = await readFile(new URL('../supabase/schema_v71.sql', import.meta.url), 'utf8')
const v76 = await readFile(new URL('../supabase/schema_v76.sql', import.meta.url), 'utf8')
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
  create type public.user_role as enum ('guest', 'applicant', 'voyager', 'architect');
  create table public.voyager_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null, role public.user_role, email text, experiment_group text,
    bio text, location text, avatar_url text
  );
`)
await db.exec(v71.slice(v71.indexOf('alter table'), v71.indexOf('alter table public.device_batches')))
await db.exec(`
  create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
  grant usage on schema public to service_role, authenticated;
  grant select, update on public.voyager_profiles to service_role, authenticated;
`)
const id = '00000000-0000-0000-0000-000000000001'
async function createUser(metadata, userMetadata = {}) {
  // Mirror GoTrue: INSERT first, trusted metadata UPDATE later, then COMMIT.
  await db.exec('begin')
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [id, 'Example@npc.invalid', { display_name: 'Johnaason', ...userMetadata }])
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1', [id, metadata])
  await db.exec('commit')
}
async function profile() {
  return (await db.query('select account_kind,role,email,experiment_group from public.voyager_profiles where id=$1', [id])).rows[0]
}
await createUser({ account_kind: 'npc' })
assert.equal((await profile()).account_kind, 'human', 'reproduce the original failure')
await db.query('delete from auth.users where id=$1', [id])
await db.exec(v76)
await createUser({ account_kind: 'npc' })
assert.deepEqual(await profile(), { account_kind: 'npc', role: 'guest', email: null, experiment_group: null })
await db.exec('set role service_role')
assert.equal((await db.query("update public.voyager_profiles set bio=$2, location=$3, avatar_url=null where id=$1 and account_kind='npc' returning id", [id, "I believe in things many people don't, but what does that matter?", 'Las Vegas'])).rows.length, 1)
await assert.rejects(db.query("update public.voyager_profiles set account_kind='human' where id=$1", [id]), /Account kind cannot be changed/)
await db.exec('set role authenticated')
await assert.rejects(db.query("update public.voyager_profiles set bio='spoof' where id=$1", [id]), /managed by administrators/)
await db.exec('reset role')
await db.query('delete from auth.users where id=$1', [id])
await createUser({}, { account_kind: 'npc' })
const human = await profile()
assert.equal(human.account_kind, 'human', 'user metadata cannot create an NPC')
assert.equal(human.role, 'applicant')
assert.equal(human.email, 'example@npc.invalid')
assert.ok(['direct', 'task_gated'].includes(human.experiment_group))
await db.query('delete from auth.users where id=$1', [id])
await db.exec('begin')
await db.query('insert into auth.users(id,email) values ($1,$2)', [id, 'removed@npc.invalid'])
await db.query('delete from auth.users where id=$1', [id])
await db.exec('commit')
assert.equal(await profile(), undefined, 'a deleted Auth user leaves no profile')
await db.close()
console.log('NPC creation regression passed: delayed metadata, profile save, human signup, spoof rejection and identity protections.')
