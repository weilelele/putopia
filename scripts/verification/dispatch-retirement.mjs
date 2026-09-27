import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table signal_threads(id int primary key,world_id text);
create table signal_tasks(id int primary key,thread_id int references signal_threads(id),day_index int,created_at timestamptz,published_at timestamptz,cosmo_session_id text,prev_task_id int references signal_tasks(id) on delete set null);
create table signal_task_assets(id int primary key,task_id int references signal_tasks(id) on delete cascade);
create table signal_responses(task_id int references signal_tasks(id) on delete cascade,user_id int,selected_asset_id int references signal_task_assets(id) on delete cascade);
create table signal_recall_log(task_id int references signal_tasks(id) on delete cascade,user_id int);
create table signal_engagement_log(user_id int);
create table cosmo_requests(id int primary key);
create table dreamcatcher_jobs(id int primary key,status text,completed_at timestamptz,updated_at timestamptz);
insert into signal_threads values(1,'world'),(2,'empty'),(3,null);
insert into dreamcatcher_jobs values(1,'processing',null,null);
insert into signal_tasks(id,thread_id,day_index,created_at,cosmo_session_id,prev_task_id)
select n,case when n<=7 then 1 when n<=9 then 2 else 3 end,n,'2026-01-01'::timestamptz+make_interval(hours=>n),'session-'||n,case when n>1 then n-1 else null end from generate_series(1,10) n;
insert into signal_task_assets select id,id from signal_tasks;
insert into signal_responses values(2,1,2),(5,1,5),(6,1,6);
`)
await db.exec(await readFile('supabase/schema_v78.sql','utf8'))
assert.deepEqual((await db.query('select id from signal_tasks order by id')).rows.map(x=>x.id),[2,3,5,6,7,10])
assert.equal((await db.query('select count(*)::int n from signal_responses')).rows[0].n,3)
assert.equal((await db.query("select count(*)::int n from maintenance.dispatch_retirement_backup where source_table='signal_tasks'")).rows[0].n,9)
assert.equal((await db.query('select status from dreamcatcher_jobs')).rows[0].status,'withdrawn')
for (const sql of ["insert into cosmo_requests values(1)","insert into signal_recall_log values(2,2)","insert into signal_engagement_log values(2)","insert into signal_tasks(id,cosmo_session_id) values(11,'late')"]) await assert.rejects(db.exec(sql),/retired/)
await db.exec("begin; select set_config('app.dreamcatcher_request','round',true); insert into cosmo_requests values(1); commit;")
await assert.rejects(db.exec('insert into cosmo_requests values(2)'),/retired/)
console.log('PASS: voted rounds + immediate successors retained; empty worlds pruned; unrelated tasks retained; backup complete; votes preserved; old requests/import/mail blocked; new-round scope allowed')
await db.close()
