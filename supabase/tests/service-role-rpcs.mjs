// Disposable PostgreSQL only. Pass an installed PGlite module; no env or network.
// Production server code calls RPCs through the service_role client, and most of them are
// security invoker, so every table/sequence they touch needs a service_role grant. Owner-run
// fixtures hid a missing sequence grant for 35 hours (v109); this test runs them as service_role.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const repo = new URL('../../', import.meta.url)
const supabaseDir = new URL('supabase/', repo)

// Migrations after the shared v90 fixture apply automatically, so a new Initiation RPC is checked
// as soon as its migration lands. Only skip a migration that needs Supabase-only schemas here.
const BASE = ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '92', '93', '94']
const SKIP = {
  95: 'quiz/outreach tables are outside the Initiation fixture',
  96: 'needs auth.users',
  99: 'needs storage.buckets',
  100: 'Voyager Feed, depends on v99',
  101: 'Voyager Feed, depends on v99',
}
const later = (await fs.readdir(supabaseDir))
  .map(file => /^schema_v(\d+)\.sql$/.exec(file)?.[1]).filter(Boolean).map(Number)
  .filter(v => v > 94 && !(v in SKIP)).sort((a, b) => a - b).map(String)

// Every RPC name the app calls (admin or user client), read from source so new calls are covered.
const walk = async dir => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(entry => {
  const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir)
  return entry.isDirectory() ? walk(path) : /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : []
}))).flat()
const rpcNames = new Set()
for (const file of await walk(new URL('src/', repo))) {
  for (const match of (await fs.readFile(file, 'utf8')).matchAll(/\.rpc\(\s*['"]([a-z0-9_]+)['"]/g)) rpcNames.add(match[1])
}
assert.ok(rpcNames.has('complete_initiation'), 'RPC scan found the payment completion call')

// Static: migrations PGlite cannot load are still covered. Any sequence a migration hands to
// nextval/currval/setval must be granted to service_role by some migration.
const sqlFiles = async dir => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(entry => {
  const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir)
  return entry.isDirectory() ? sqlFiles(path) : entry.name.endsWith('.sql') && !entry.name.includes('rollback') ? [path] : []
}))).flat()
const seqName = name => name.replace(/"/g, '').replace(/^public\./i, '').toLowerCase()
const usedSequences = new Map()
const grantedSequences = new Set()
for (const file of await sqlFiles(supabaseDir)) {
  const sql = (await fs.readFile(file, 'utf8')).replace(/--[^\n]*/g, '')
  for (const [, name] of sql.matchAll(/\b(?:nextval|currval|setval)\s*\(\s*'([^']+)'/gi)) {
    usedSequences.set(seqName(name), file.pathname.split('/supabase/')[1])
  }
  for (const [, names] of sql.matchAll(/\bgrant\s[^;]*?\bon\s+sequence\s+([^;]+?)\s+to\s+[^;]*\bservice_role\b/gi)) {
    for (const name of names.split(',')) grantedSequences.add(seqName(name.trim()))
  }
}
assert.ok(usedSequences.has('voyager_member_no_seq'), 'sequence scan found the member-number sequence')
assert.deepEqual([...usedSequences].filter(([name]) => !grantedSequences.has(name)), [],
  'sequences used by migrations need `grant usage, select on sequence … to service_role`')

const db = new PGlite()
try {
  const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  await db.exec(blocks[0][1])
  // Mirror Supabase: tables and functions are granted to the API roles by default privileges.
  // Sequences are deliberately left out — production's member-number sequence had no grant,
  // so every sequence a server RPC uses must be granted explicitly by its migration.
  await db.exec(`grant usage on schema public to anon,authenticated,service_role;
    grant all on all tables in schema public to anon,authenticated,service_role;
    grant execute on all functions in schema public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`)
  await db.exec(blocks[1][1])
  for (const name of [...BASE, ...later]) {
    await db.exec(await fs.readFile(new URL(`schema_v${name}.sql`, supabaseDir), 'utf8'))
  }

  const rows = async (sql, params = []) => (await db.query(sql, params)).rows
  const scalar = async (sql, params = []) => Object.values((await rows(sql, params))[0])[0]
  const asService = async (sql, params = []) => {
    await db.exec('set role service_role')
    try { return await rows(sql, params) } finally { await db.exec('reset role') }
  }
  const svc = async (sql, params = []) => Object.values((await asService(sql, params))[0] ?? {})[0]

  // Catalog: every app RPC that exists here is executable by service_role.
  const present = await rows(`select p.oid::regprocedure::text sig, has_function_privilege('service_role',p.oid,'EXECUTE') ok
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1)`, [[...rpcNames]])
  assert.ok(present.length >= 20, `expected the Initiation RPCs in the fixture, found ${present.length}`)
  assert.deepEqual(present.filter(p => !p.ok).map(p => p.sig), [], 'service_role cannot execute these app RPCs')

  // Catalog: sequences used by security invoker functions, or by column defaults on tables
  // service_role can write, need service_role USAGE. Identity columns need no grant.
  const ungranted = await rows(`
    with used as (
      select p.oid::regprocedure::text as used_by, m[1] as name
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join lateral regexp_matches(p.prosrc, $re$(?:nextval|currval|setval)\\s*\\(\\s*'([^']+)'$re$, 'gi') m
      where n.nspname not in ('pg_catalog','information_schema') and not p.prosecdef
        and has_function_privilege('service_role', p.oid, 'EXECUTE')
      union all
      select d.adrelid::regclass::text, m[1]
      from pg_attrdef d cross join lateral regexp_matches(pg_get_expr(d.adbin, d.adrelid), $re$nextval\\('([^']+)'$re$) m
      where has_table_privilege('service_role', d.adrelid, 'INSERT')
    )
    select used_by, name from used
    where to_regclass(name) is null or not has_sequence_privilege('service_role', to_regclass(name), 'USAGE')
    order by 1, 2`)
  assert.deepEqual(ungranted, [], 'sequences used on the service_role path need an explicit grant')

  // Behaviour: drive the server-side Initiation flow exactly as production does.
  const uid = n => `57000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const shipping = { name: 'Service Fixture', address: { line1: '1 Fixture', country: 'US', state: 'MD' } }
  for (const n of [1, 2, 3]) await rows("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [uid(n)])
  await rows("insert into voyager_profiles(id,role,account_kind) values($1,'architect','human'),($2,'applicant','npc')", [uid(200), uid(300)])
  await rows("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),'cs_live_svc_old12','pi_svc_old12')", [uid(3)])
  await rows("insert into device_batches(slug,code,publication_status,listing_quantity) values('kyoto','KY','published',1)")
  await rows("insert into device_batch_units(batch_slug,sequence_no,unit_code,status) values('kyoto',1,'KY-001','available')")
  await asService('update initiation_batches set checkout_open=true')

  assert.equal(typeof await svc('select initiation_availability()'), 'object')
  assert.equal(await svc('select eligible_initial_initiation_order($1)', [uid(1)]), null)
  assert.ok(await svc('select eligible_legacy_initiation_order($1)', [uid(3)]))
  const orders = {}
  for (const [n, kind] of [[1, 'initial'], [2, 'standard'], [3, 'legacy_upgrade']]) {
    const order = await svc('select reserve_initiation_v2($1,$2,$3,$4,null)', [uid(n), `price_${kind}`, 'prod_fixture', kind])
    // The checkout route stores the Stripe session, then queues the funnel event.
    await asService('update initiation_orders set stripe_session_id=$2 where id=$1', [order.id, `cs_svc_${n}`])
    await asService('select queue_initiation_checkout_analytics($1,false)', [order.id])
    await asService('select complete_initiation($1,$2,$3,$4,$5)', [order.id, `cs_svc_${n}`, uid(n), `pi_svc_${n}`, shipping])
    assert.equal(await scalar('select status from initiation_orders where id=$1', [order.id]), 'paid')
    assert.equal(await scalar("select role::text||':'||(member_no is not null)::text from voyager_profiles where id=$1", [uid(n)]), 'voyager:true')
    orders[n] = order
  }
  assert.equal((await svc('select initiation_access_state($1)', [uid(2)])).formal, true)
  assert.ok((await asService('select * from claim_initiation_analytics(null,5)')).length > 0)
  assert.ok((await asService('select * from claim_initiation_meta_purchases(null,10)')).length > 0)
  await asService('select claim_voyager_calibration_reminder($1,false)', [uid(1)])

  assert.equal((await svc("select device_claim_supply('kyoto')")).status, 'available')
  const claim = await svc("select claim_initiation_console($1,'kyoto')", [uid(2)])
  await asService("select fulfill_initiation_console($1,$2,'preparing','KY-001',null)", [uid(200), claim.orderId])
  const pack = await scalar('select id from initiation_shipments where user_id=$1 and position=1', [uid(2)])
  await asService("select fulfill_initiation_shipment($1,$2,'preparing',null)", [uid(200), pack])
  assert.equal(await svc('select has_bound_console($1)', [uid(2)]), false)

  await asService('select npc_initiation_state($1,$2)', [uid(200), uid(300)])
  await asService('select provision_voyager($1)', [uid(1)])

  await asService('select record_initiation_refund($1,$2,1000)', ['pi_svc_1', orders[1].amount])
  await asService("select hold_initiation_payment('pi_svc_3','disputed')")
  await asService("select hold_initiation_payment('pi_svc_2','refunded')")
  assert.equal((await svc('select initiation_access_state($1)', [uid(2)])).formal, false)

  console.log(`service-role-rpcs: ${present.length} app RPCs executable, no ungranted sequences, Initiation flow passes as service_role (migrations ${[...BASE, ...later].join(',')})`)
} finally {
  await db.close()
}
