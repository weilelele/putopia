// Isolated migration regression; no network or application environment.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key,email text);
create table voyager_profiles(id uuid primary key,display_name text);
create table initiation_members(user_id uuid,active boolean);
insert into auth.users values('${a}','deleted-${a}@deleted.invalid'),('${b}','normal@example.test');
insert into voyager_profiles values('${a}','Deleted member'),('${b}','Deleted member');
insert into initiation_members values('${a}',true),('${b}',true);`)
await db.exec(await fs.readFile(new URL('../schema_v96.sql',import.meta.url),'utf8'))
assert.deepEqual((await db.query('select user_id from account_deletions')).rows,[{user_id:a}])
for(const role of ['anon','authenticated']) {
 await db.exec(`set role ${role}`)
 for(const sql of ['select * from account_deletions',`insert into account_deletions(user_id) values('${b}')`,'delete from account_deletions','truncate account_deletions']) await assert.rejects(db.exec(sql),/permission denied/)
 await db.exec('reset role')
}
await db.exec(`set role service_role; insert into account_deletions(user_id) values('${b}'); update account_deletions set requested_at=now();`)
assert.equal((await db.query('select count(*)::int as n from account_deletions')).rows[0].n,2)
await db.exec(`delete from account_deletions where user_id='${b}'; reset role; delete from voyager_profiles where id='${a}';`)
assert.equal((await db.query('select count(*)::int as n from account_deletions')).rows[0].n,0)
assert.equal((await db.query('select count(*)::int as n from initiation_members where active')).rows[0].n,2)
await db.close()
console.log('v96: exact tombstone backfill, private ACL, service CRUD, cascade and unchanged seats verified')
