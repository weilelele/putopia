// Seed only the disposable local Supabase stack created for this verification.
// Uses the existing minimal payment-schema fixture, NOT a production dump.
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { pathToFileURL } from 'node:url'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
const directory = '/private/tmp/putopia-initiation-sandbox'
const env = parseEnv(await fs.readFile(path.join(directory, 'local.env'), 'utf8'))
for (const key of ['API_URL', 'DB_URL']) {
  const url = new URL(env[key])
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback services are allowed')
}
const { default: pg } = await import(pathToFileURL('/private/tmp/putopia-payment-postgres/node_modules/pg/lib/index.js'))
const db = new pg.Client({ connectionString: env.DB_URL })
await db.connect()
try {
  const existing = await db.query("select to_regclass('public.putopia_payment_sandbox') marker,to_regclass('public.voyager_profiles') profile")
  if (!existing.rows[0].marker) {
    assert.equal(existing.rows[0].profile, null, 'Refuse to initialize a database with existing application data')
    const harness = await fs.readFile(new URL('../../supabase/tests/initiation-v90.mjs', import.meta.url), 'utf8')
    const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2).map(m => m[1])
    assert.equal(blocks.length, 2)
    // Real Supabase owns auth and roles; preserve those instead of mock auth functions.
    blocks[0] = blocks[0].slice(blocks[0].indexOf('create type user_role'))
    for (const sql of blocks) await db.query(sql)
    for (const version of [83, 85, 90, 87, 88, 89, 91, 94]) await db.query(await fs.readFile(new URL(`../../supabase/${({83:'schema_v83_initiation.sql',85:'schema_v85_initiation_roster.sql',87:'schema_v87_npc_initiation.sql'})[version] ?? `schema_v${version}.sql`}`, import.meta.url), 'utf8'))
    await db.query("create table public.putopia_payment_sandbox(id text primary key); insert into public.putopia_payment_sandbox values('local-only-fixture-v1'); revoke all on public.putopia_payment_sandbox from public,anon,authenticated")
    await db.query('grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role')
    await db.query("update initiation_batches set checkout_open=true,stripe_livemode=false; notify pgrst,'reload schema'")
  }
  const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const fixtures = []
  for (const kind of ['standard', 'legacy_upgrade']) {
    const email = `payment-${randomUUID()}@example.test`, password = randomBytes(24).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw new Error(`Local Auth fixture creation failed: ${error.code ?? 'unknown'}`)
    const id = data.user.id
    await db.query("insert into voyager_profiles(id,role,account_kind,email) values($1,'applicant','human',$2)", [id, email])
    await db.query("insert into voyager_intake values($1,'voyager-profile-v1')", [id])
    // The legacy eligibility function requires historical live-mode evidence.
    // This synthetic cs_live_fixture value exists ONLY in this marked local DB.
    if (kind === 'legacy_upgrade') await db.query("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),$2,$3)", [id, `cs_live_fixture_${id}`, `pi_fixture_${id}`])
    const client = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const signed = await client.auth.signInWithPassword({ email, password })
    if (signed.error) throw new Error('Local Auth password login failed')
    assert.equal((await client.auth.getUser()).data.user.id, id)
    fixtures.push({ id, kind, email, password, accessToken: signed.data.session.access_token })
  }
  await fs.writeFile(path.join(directory, 'fixtures.json'), JSON.stringify(fixtures), { mode: 0o600 })
  const availability = await admin.rpc('initiation_availability')
  assert.equal(availability.error, null)
  console.log(JSON.stringify({ localSupabase: 'ready', auth: 'two isolated users signed in', schema: 'payment fixture with complete v83/v85/v90/v87/v88/v89/v91', restRpc: 'passed', email: 'admin create only; no email send', productionWrites: 0 }))
} finally { await db.end() }
