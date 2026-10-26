// Disposable PostgreSQL only. Pass an installed PGlite module; no env or network.
// Completion runs as service_role in production; owner-run fixtures hid a missing sequence grant.
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
  for (const name of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105', '107', '108']) {
    await db.exec(await fs.readFile(new URL(`../schema_v${name}.sql`, import.meta.url), 'utf8'))
  }
  // Mirror Supabase's default table/function grants, which never covered this sequence.
  await db.exec(`grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;
    grant execute on all functions in schema public to service_role;
    update initiation_batches set checkout_open=true`)
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
  const uid = n => `56000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const shipping = { name: 'Grant Fixture', address: { line1: '1 Fixture', country: 'US', state: 'MD' } }
  const complete = async n => {
    await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [uid(n)])
    const kind = n === 1 ? 'initial' : 'standard'
    const order = await scalar('select reserve_initiation_v2($1,$2,$3,$4,null)', [uid(n), `price_${kind}`, 'prod_fixture', kind])
    await db.exec('set role service_role')
    try { await db.query('select complete_initiation($1,$2,$3,$4,$5)', [order.id, `cs_grant_${n}`, uid(n), `pi_grant_${n}`, shipping]) }
    finally { await db.exec('reset role') }
    return order.id
  }

  await assert.rejects(complete(1), /permission denied for sequence voyager_member_no_seq/)
  await db.exec(await fs.readFile(new URL('../schema_v109.sql', import.meta.url), 'utf8'))
  for (const n of [2, 3]) {
    const orderId = await complete(n)
    assert.equal(await scalar('select status from initiation_orders where id=$1', [orderId]), 'paid')
    assert.equal(await scalar("select role::text||':'||(member_no is not null)::text from voyager_profiles where id=$1", [uid(n)]), 'voyager:true')
  }
  console.log('member-no-grant-v109: service_role completes Initial and Complete purchases')
} finally {
  await db.close()
}
