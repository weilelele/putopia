// Isolated ACL regression test. No network or application environment is read.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const tables = ['quiz_questions', 'outreach_log', 'outreach_replies']
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
for (const table of tables) await db.exec(`create table ${table}(id int primary key, private_value text); insert into ${table} values(1,'private'); grant all on ${table} to public,anon,authenticated,service_role;`)
await db.exec(await fs.readFile(new URL('../schema_v95.sql', import.meta.url), 'utf8'))
for (const role of ['anon', 'authenticated']) {
  await db.exec(`set role ${role}`)
  for (const table of tables) for (const query of [`select * from ${table}`, `insert into ${table} values(2,'bad')`, `update ${table} set private_value='bad'`, `delete from ${table}`, `truncate ${table}`]) {
    await assert.rejects(db.exec(query), /permission denied/)
  }
  await db.exec('reset role')
}
await db.exec('set role service_role')
for (const table of tables) {
  assert.equal((await db.query(`select private_value from ${table}`)).rows[0].private_value, 'private')
  await db.exec(`insert into ${table} values(2,'new'); update ${table} set private_value='updated' where id=2; delete from ${table} where id=2;`)
}
await db.exec('reset role')
assert.equal((await db.query("select count(*)::int as count from pg_class where relname in ('quiz_questions','outreach_log','outreach_replies') and relrowsecurity")).rows[0].count, 3)
await db.close()
console.log('v95: denied public reads/writes/truncate; service CRUD and RLS verified')
