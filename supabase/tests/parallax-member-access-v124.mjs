import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Disposable PostgreSQL with no real accounts, device jobs or network calls.
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const member = '00000000-0000-0000-0000-000000000001'
const applicant = '00000000-0000-0000-0000-000000000002'
const revoked = '00000000-0000-0000-0000-000000000003'
const roundTask = '00000000-0000-0000-0000-000000000004'
const holder = '00000000-0000-0000-0000-000000000006'
const legacyTask = '00000000-0000-0000-0000-000000000005'

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema membership_private;
    revoke all on schema membership_private from public;
    create table membership_private.access_fixture(id uuid, stored_role text, effective_role text);
    insert into membership_private.access_fixture values
      ('${member}', 'voyager', 'voyager'),
      ('${applicant}', 'applicant', 'applicant'),
      ('${revoked}', 'voyager', 'applicant'), ('${holder}', 'voyager', 'voyager');
    create function membership_private.access_role_for(uid uuid) returns text
      language sql stable as $$
        select effective_role from membership_private.access_fixture where id = uid;
      $$;
    create function public.has_bound_console(uid uuid) returns boolean
      language sql stable as $$ select uid = '${holder}'::uuid $$;
    create table public.mission_acceptances(user_id uuid, mission_id text);
    create table public.dreamcatcher_jobs(submitted_by uuid, submission_source text);
    create table public.dreamcatcher_rounds(task_id uuid unique);
    create table public.signal_responses(task_id uuid, user_id uuid);
    insert into public.dreamcatcher_rounds values ('${roundTask}');
    grant insert on public.dreamcatcher_jobs, public.signal_responses, public.mission_acceptances to service_role;
  `)
  await db.exec(await readFile(new URL('../schema_v124.sql', import.meta.url), 'utf8'))
  await db.exec('set role service_role')
  const submit = (user, source) => db.query('insert into public.dreamcatcher_jobs values ($1, $2)', [user, source])
  const respond = (task, user) => db.query('insert into public.signal_responses values ($1, $2)', [task, user])
  for (const source of ['device', 'voyager_profile']) {
    await assert.rejects(() => submit(applicant, source), /Voyager membership is required/)
    await assert.rejects(() => submit(revoked, source), /Voyager membership is required/)
    await submit(member, source)
  }
  await assert.rejects(() => respond(roundTask, applicant), /Voyager membership is required/)
  await assert.rejects(() => respond(roundTask, revoked), /Voyager membership is required/)
  await respond(roundTask, member)
  await respond(legacyTask, applicant)
  const accept = user => db.query("insert into public.mission_acceptances values ($1, 'REC-200')", [user])
  await assert.rejects(() => accept(applicant), /bound Multiverse Console/)
  await assert.rejects(() => accept(member), /bound Multiverse Console/)
  await accept(holder)
  await db.exec('reset role')
  assert.deepEqual((await db.query('select distinct submitted_by from public.dreamcatcher_jobs')).rows, [{ submitted_by: member }])
  assert.deepEqual((await db.query('select user_id from public.mission_acceptances')).rows, [{ user_id: holder }])
  console.log('v124 restricts Parallax submissions and responses to Voyagers and mission acceptance to bound Console holders.')
} finally {
  await db.close()
}
