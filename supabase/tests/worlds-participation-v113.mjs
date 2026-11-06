// Isolated SQL verification of the v113 Worlds participation gate.
// Usage: node supabase/tests/worlds-participation-v113.mjs /path/to/@electric-sql/pglite/dist/index.js
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const read = (path) => fs.readFile(new URL(path, import.meta.url), 'utf8')
try {
  const harness = await read('../../scripts/verification/dreamcatcher-rounds.mjs')
  await db.exec(harness.match(/await db\.exec\(`([\s\S]*?)`\)/)[1])
  for (const version of ['54', '67', '78', '77', '79', '80']) await db.exec(await read(`../schema_v${version}.sql`))
  await db.exec(`
    create table voyager_orders(id uuid primary key default gen_random_uuid(), user_id uuid, status text);
    create table initiation_orders(id uuid primary key default gen_random_uuid(), user_id uuid, status text);
  `)
  await db.exec(await read('../schema_v113.sql'))

  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const [voyager, architect, packBuyer, initiationBuyer, refunded, applicant, pending] = [1, 2, 3, 4, 5, 6, 7].map(id)
  await db.query(`insert into voyager_profiles values
    ($1,'V','voyager'),($2,'A','architect'),($3,'P','applicant'),($4,'I','applicant'),($5,'R','applicant'),($6,'N','applicant'),($7,'W','applicant')`,
    [voyager, architect, packBuyer, initiationBuyer, refunded, applicant, pending])
  await db.query(`insert into voyager_orders(user_id,status) values($1,'delivered'),($2,'refunded'),($3,'pending')`, [packBuyer, refunded, pending])
  await db.query(`insert into initiation_orders(user_id,status) values($1,'paid'),($2,'refunded'),($3,'pending')`, [initiationBuyer, refunded, pending])

  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]
  let key = 0
  const submit = (user, slug) => one(
    "select submit_dreamcatcher_round_world($1,$2,'Dream','A long enough dream about a station over the sea',$3) as id",
    [user, slug, id(1000 + key++)])
  const denied = /Only Voyagers and members with a paid order/

  for (const user of [refunded, applicant, pending, id(99)]) await assert.rejects(submit(user, 'kyoto-02'), denied)
  await assert.rejects(one(`select create_observation_world($1,'n','n','d','x','a','b',null,null)`, [applicant]), denied)
  const world = (await submit(voyager, 'kyoto-02')).id
  for (const user of [architect, packBuyer, initiationBuyer]) assert.match((await submit(user, 'tokyo-01')).id, /^PROP-/)
  assert.equal((await one("select has_function_privilege('authenticated','can_submit_observation(uuid)','execute') as allowed")).allowed, false)

  // Publish a round directly so the vote gate can be exercised without the Cosmo path.
  const round = await one('select * from dreamcatcher_rounds where world_id=$1', [world])
  const thread = await one('select signal_thread_id as id from dreamcatcher_jobs where id=$1', [round.job_id])
  await db.query("select set_config('app.dreamcatcher_publish',$1,false)", [round.id])
  const task = await one(`insert into signal_tasks(thread_id,day_index,type,prompt,task_date,is_published,published_at,dreamcatcher_round_id)
    values($1,0,'visual_match','Pick',current_date,true,now(),$2) returning id`, [thread.id, round.id])
  const asset = await one(`insert into signal_task_assets(task_id,media,source_asset_id,asset_role,is_selected,display_order)
    values($1,'image','a','option',true,0) returning id`, [task.id])
  await db.query("update worlds set lifecycle_state='syncing' where id=$1", [world])
  await db.query("update dreamcatcher_rounds set status='voting_open',task_id=$2,opened_at=now(),closes_at=now()+interval '1 hour' where id=$1", [round.id, task.id])
  const vote = (user) => db.query('select respond_dreamcatcher_round($1,$2,$3)', [task.id, asset.id, user])

  // Paid applicants may submit, not vote. Every scope except 'self' means Voyagers.
  for (const scope of ['all', 'voters', 'self']) {
    await db.query('update worlds set vote_scope=$2 where id=$1', [world, scope])
    for (const user of [packBuyer, initiationBuyer, applicant]) await assert.rejects(vote(user), /Only Voyagers can vote/)
  }
  await db.query("update worlds set vote_scope='self',discoverer_id=$2 where id=$1", [world, packBuyer])
  await assert.rejects(vote(voyager), /not eligible/)
  await db.query("update worlds set vote_scope='all',discoverer_id=$2 where id=$1", [world, voyager])
  await vote(voyager)
  await vote(architect)
  assert.equal((await one('select count(*)::int n from signal_responses where task_id=$1', [task.id])).n, 2)

  // A non-Voyager original submitter cannot use the zero-response fallback either.
  await db.query("select set_config('app.dreamcatcher_response',$1,false)", [round.id])
  await db.query('delete from signal_responses where task_id=$1', [task.id])
  await db.query("update dreamcatcher_rounds set initiator_id=$2,closes_at=now()-interval '1 second' where id=$1", [round.id, packBuyer])
  await assert.rejects(vote(packBuyer), /Only Voyagers can vote/)
  assert.equal((await one('select status from dreamcatcher_rounds where id=$1', [round.id])).status, 'voting_open')

  // Rollback restores the prior submission rule and removes the helper.
  await db.exec(await read('../schema_v113.rollback.sql'))
  assert.match((await submit(applicant, 'tokyo-01')).id, /^PROP-/)
  assert.equal((await one("select to_regprocedure('public.can_submit_observation(uuid)') as f")).f, null)
  console.log('v113 participation gate: ok')
} finally {
  await db.close()
}
