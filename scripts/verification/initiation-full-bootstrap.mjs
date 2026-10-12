// Extend ONLY the marked, loopback integration fixture for real Next/browser tests.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'
const base = '/private/tmp/putopia-initiation-sandbox'
const env = parseEnv(await fs.readFile(`${base}/local.env`, 'utf8'))
assert.equal(new URL(env.DB_URL).hostname, '127.0.0.1')
assert.equal(new URL(env.API_URL).hostname, '127.0.0.1')
const { default: pg } = await import(pathToFileURL('/private/tmp/putopia-payment-postgres/node_modules/pg/lib/index.js'))
const db = new pg.Client({ connectionString: env.DB_URL }); await db.connect()
assert.equal((await db.query('select id from putopia_payment_sandbox')).rows[0].id, 'local-only-fixture-v1')
await db.query(`
alter table voyager_profiles add column if not exists joined_at timestamptz default now();
alter table voyager_intake add column if not exists answers jsonb, add column if not exists observation_world_id text, add column if not exists completed_at timestamptz default now();
alter table voyager_intake alter column version set default 'voyager-profile-v1';
create table if not exists dreamcatchers(id uuid primary key, slug text, is_public boolean, round_duration_minutes integer);
alter table dreamcatchers enable row level security;
alter table voyager_orders add column if not exists created_at timestamptz default now(), add column if not exists carrier text;
alter table device_order_packs add column if not exists stage_id text, add column if not exists stage_position int, add column if not exists label text,
 add column if not exists expected_window text, add column if not exists is_console_pack boolean, add column if not exists tracking_number text, add column if not exists tracking_url text;
alter table device_batches add column if not exists name text, add column if not exists content jsonb, add column if not exists published_content jsonb,
 add column if not exists revision int default 1, add column if not exists created_at timestamptz default now(),
 add column if not exists price_amount numeric, add column if not exists price_currency text;
create table if not exists mc_functions(id uuid primary key,sort_order int,title text);
alter table mc_functions enable row level security;
alter table voyager_orders enable row level security;
alter table device_batch_units enable row level security;
alter table device_order_packs enable row level security;
alter table device_batches enable row level security;
alter table devices enable row level security;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='sandbox_units_order_fkey') then
  alter table device_batch_units add constraint sandbox_units_order_fkey foreign key(order_id) references voyager_orders(id);
 end if;
end $$;
`)
// Use the real calibration SQL functions; optional observation sharing is not exercised.
const intake = await fs.readFile(new URL('../../supabase/schema_v81.sql', import.meta.url), 'utf8')
await db.query(intake.slice(intake.indexOf('create function public.activate_voyager_path'), intake.indexOf('-- The ungated grant helper')).replaceAll('create function public.', 'create or replace function public.'))
await db.query(`
drop policy if exists sandbox_orders_own on voyager_orders;
create policy sandbox_orders_own on voyager_orders for select to authenticated using(user_id=auth.uid());
drop policy if exists sandbox_units_own on device_batch_units;
create policy sandbox_units_own on device_batch_units for select to authenticated using(user_id=auth.uid());
drop policy if exists sandbox_packs_own on device_order_packs;
create policy sandbox_packs_own on device_order_packs for select to authenticated using(exists(select 1 from voyager_orders o where o.id=order_id and o.user_id=auth.uid()));
grant select on voyager_orders,device_batch_units,device_order_packs to authenticated;
drop policy if exists sandbox_devices_own on devices;
create policy sandbox_devices_own on devices for select to authenticated using(current_user_id=auth.uid());
grant select on devices to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
`)
const fixtureCode = ts.transpileModule(await fs.readFile(new URL('../../src/lib/__fixtures__/device-batches.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText
const { DEVICE_BATCHES } = await import(`data:text/javascript;base64,${Buffer.from(fixtureCode).toString('base64')}`)
const slug = `sandbox-console-${Date.now()}`
const batch = { ...DEVICE_BATCHES[0], slug, code: 'SBX', name: 'Sandbox Console Batch', image: '/assets/device-console.jpg', inventory: { claimedQuantity: 0, listingQuantity: 2 }, lead: { ...DEVICE_BATCHES[0].lead, name: 'Sandbox Lead' } }
await db.query("insert into device_batches(slug,code,name,publication_status,listing_quantity,content,published_content) values($1,'SBX',$2,'published',2,$3,$3)", [slug, batch.name, batch])
for (const n of [1, 2]) await db.query("insert into device_batch_units(batch_slug,sequence_no,unit_code,status) values($1,$2,$3,'available')", [slug, n, `${slug}-${n}`])
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `e2e-${randomUUID()}@example.test`, password = randomUUID()
const result = await admin.auth.admin.createUser({ email, password, email_confirm: true })
assert.equal(result.error, null)
await db.query("insert into voyager_profiles(id,display_name,email,role,account_kind,registered_at) values($1,'Sandbox Voyager',$2,'applicant','human',now())", [result.data.user.id, email])
await db.query("notify pgrst,'reload schema'")
await fs.writeFile(`${base}/full-fixture.json`, JSON.stringify({ id: result.data.user.id, email, password, slug }), { mode: 0o600 })
await db.end()
console.log(JSON.stringify({ ready: true, calibration: 'real SQL; not pre-completed', identity: 'local Auth fixture', batch: slug }))
