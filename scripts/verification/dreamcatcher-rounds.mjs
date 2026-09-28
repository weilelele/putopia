// Isolated SQL verification. No network/production credentials or Vitest DB access.
// Usage: node scripts/verification/dreamcatcher-rounds.mjs /path/to/@electric-sql/pglite/dist/index.js
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create table voyager_profiles(id uuid primary key, display_name text, role text);
create table worlds(id text primary key,name text,name_en text,description text,discoverer_id uuid,discoverer_name text,submitted_by uuid,submitted_at timestamptz,discovery_date date,gradient_from text,gradient_to text,image_path text,lifecycle_state text,is_verified boolean,dreamcatcher_id uuid,vote_scope text,scan_until timestamptz,scan_resolved_at timestamptz);
create type signal_task_type as enum ('visual_match','visual_odd_one','audio_odd_one','audio_match');
create type signal_asset_media as enum ('image','video','audio');
create table signal_threads(id uuid primary key default gen_random_uuid(),world_id text,type signal_task_type,created_by uuid);
create table signal_tasks(id uuid primary key default gen_random_uuid(),thread_id uuid references signal_threads(id),day_index integer,type signal_task_type,prompt text,task_date date,is_published boolean,published_at timestamptz,cosmo_session_id text,created_at timestamptz default now());
create table signal_task_assets(id uuid primary key default gen_random_uuid(),task_id uuid references signal_tasks(id),media signal_asset_media,source_asset_id text,source_url text,processed_url text,processed_path text,display_url text,asset_role text,is_selected boolean,display_order integer);
create table signal_recall_log(task_id uuid references signal_tasks(id) on delete cascade,user_id uuid,sent_at timestamptz);
create table signal_engagement_log(user_id uuid);
create table signal_responses(id uuid primary key default gen_random_uuid(),task_id uuid references signal_tasks(id),user_id uuid,selected_asset_id uuid references signal_task_assets(id),created_at timestamptz default now(),unique(task_id,user_id));
`)
await db.exec(await readFile('supabase/schema_v54.sql','utf8'))
await db.exec(await readFile('supabase/schema_v67.sql','utf8'))
await db.exec(await readFile('supabase/schema_v78.sql','utf8'))
await db.exec(await readFile('supabase/schema_v77.sql','utf8'))
await db.exec(await readFile('supabase/schema_v79.sql','utf8'))
const owner='00000000-0000-4000-8000-000000000001', voter='00000000-0000-4000-8000-000000000002', architect='00000000-0000-4000-8000-000000000003'
await db.query("insert into voyager_profiles values ($1,'Owner','applicant'),($2,'Voter','voyager'),($3,'Architect','architect')",[owner,voter,architect])
const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0]
const submit=async(user,slug,key)=> (await one("select submit_dreamcatcher_round_world($1,$2,'Dream','A long enough dream about a station over the sea',$3) as id",[user,slug,key])).id
const wid=await submit(owner,'kyoto-02','10000000-0000-4000-8000-000000000001')
assert.equal(await submit(owner,'kyoto-02','10000000-0000-4000-8000-000000000001'),wid)
let r=await one('select * from dreamcatcher_rounds where world_id=$1',[wid])
assert.equal(r.round_number,1)
const entry=await one('select * from worlds where id=$1',[wid])
assert.equal(entry.lifecycle_state,'proposed','Submission must use the legacy intake state')
assert.equal(entry.scan_until,null,'Device queue owns the first scan start')
assert.equal(entry.is_verified,false)
assert.match(wid,/^PROP-[0-9A-Z]{8,10}$/,'Preserve the legacy timestamp identifier format')
assert.ok(Math.abs(parseInt(wid.slice(5),36)-Date.now())<10000)
await db.exec('select advance_dreamcatcher_rounds()')
assert.equal((await one('select status from dreamcatcher_rounds where id=$1',[r.id])).status,'processing','Pending intake must survive the round cron')
assert.equal((await one('select lifecycle_state from worlds where id=$1',[wid])).lifecycle_state,'proposed','Presentation must not promote intake')
assert.equal(Date.parse((await one('select scan_until from worlds where id=$1',[wid])).scan_until),Date.parse((await one('select presentation_ready_at from dreamcatcher_rounds where id=$1',[r.id])).presentation_ready_at))
assert.equal((await one('select count(*)::int n from cosmo_requests')).n,0,'Queue movement does not dispatch before bootstrap')
assert.equal((await one("select has_function_privilege('authenticated','create_observation_world(uuid,text,text,text,text,text,text,timestamptz,uuid)','execute') as allowed")).allowed,false)

const claim=await one('select id as "requestId",input from dreamcatcher_generation_requests where round_id=$1',[r.id])
assert.equal(claim.input.roundId,r.id)
const cid=(await one('select dispatch_dreamcatcher_generation($1,$2) as id',[claim.requestId,['old-batch']])).id
assert.equal((await one('select dispatch_dreamcatcher_generation($1,$2) as id',[claim.requestId,[]])).id,cid)
assert.equal((await one('select lifecycle_state from worlds where id=$1',[wid])).lifecycle_state,'syncing','Bootstrap-confirmed dispatch promotes the world')
assert.deepEqual((await one('select payload from cosmo_requests where id=$1',[cid])).payload,{})
assert.equal((await one('select count(*)::int as n from cosmo_requests')).n,1)
const result={sessionId:'batch-one',assets:[{assetId:'a',media:'video',url:'https://example.com/a.mp4',processedUrl:'https://example.com/processed.mp4',processedPath:'cosmo/a.mp4',posterUrl:'https://example.com/animated.webp',order:0},{assetId:'b',media:'image',url:'https://example.com/b.webp',order:1}]}
await db.query('select complete_dreamcatcher_generation($1,$2)',[claim.requestId,result])
await db.exec('select advance_dreamcatcher_rounds()')
assert.equal((await one('select count(*)::int as n from signal_tasks')).n,0,'Pre-generated results must stay hidden')
assert.equal((await one('select count(*)::int n from dreamcatcher_notifications')).n,0,'No mail before presentation')
assert.equal((await one('select status from dreamcatcher_rounds where id=$1',[r.id])).status,'processing')
await db.query("update dreamcatcher_rounds set presentation_ready_at=now()-interval '1 minute' where id=$1",[r.id])
await db.exec('select advance_dreamcatcher_rounds()')
r=await one('select * from dreamcatcher_rounds where id=$1',[r.id])
assert.equal(r.status,'voting_open')
assert.equal((await one('select count(*)::int n from dreamcatcher_notifications')).n,1)
const notice=(await one('select claim_dreamcatcher_notification() as n')).n
assert.equal(notice.initiatorId,owner)
assert.equal(notice.roundId,r.id)
assert.equal((await one('select claim_dreamcatcher_notification() as n')).n,null,'Lease prevents concurrent sends')
await db.query("update dreamcatcher_notifications set lease_until=now()-interval '1 minute' where round_id=$1",[notice.roundId])
const reclaimedNotice=(await one('select claim_dreamcatcher_notification() as n')).n
assert.notEqual(reclaimedNotice.leaseToken,notice.leaseToken)
assert.equal((await one('select finish_dreamcatcher_notification($1,$2,$3,null) as ok',[notice.roundId,notice.leaseToken,'stale'])).ok,false)
await db.query('select finish_dreamcatcher_notification($1,$2,$3,null)',[notice.roundId,reclaimedNotice.leaseToken,'test-provider'])
assert.equal((await one('select claim_dreamcatcher_notification() as n')).n,null,'Sent round cannot resend')
assert.equal((await one('select cosmo_session_id from signal_tasks where id=$1',[r.task_id])).cosmo_session_id,'batch-one')
const storedAsset=await one('select * from signal_task_assets where task_id=$1 and display_order=0',[r.task_id])
assert.equal(storedAsset.processed_url,'https://example.com/processed.mp4')
assert.equal(storedAsset.processed_path,'cosmo/a.mp4')
assert.equal(storedAsset.display_url,'https://example.com/animated.webp')
assert.equal(Date.parse(r.closes_at)-Date.parse(r.opened_at),86400000)
const asset=await one('select id from signal_task_assets where task_id=$1 limit 1',[r.task_id])
await db.query('select respond_dreamcatcher_round($1,$2,$3)',[r.task_id,asset.id,voter])
assert.equal((await one('select count(*)::int as n from dreamcatcher_rounds where world_id=$1',[wid])).n,1,'First vote cannot advance early')
await db.query("update dreamcatcher_rounds set closes_at=now()-interval '1 second' where id=$1",[r.id])
await db.exec('select advance_dreamcatcher_rounds(); select advance_dreamcatcher_rounds()')
assert.equal((await one('select count(*)::int as n from dreamcatcher_rounds where world_id=$1',[wid])).n,2,'Settlement must be idempotent')
const r2=await one('select * from dreamcatcher_rounds where world_id=$1 and round_number=2',[wid])
const next=(await one('select input from dreamcatcher_generation_requests where round_id=$1',[r2.id])).input
assert.equal(next.history[0].feedback.participants,1)
assert.equal(next.history[0].feedback.tiles[0].votes,1)
// Zero-feedback cutoff: only immutable submitter, including when vote_scope excludes applicants.
const c2=await one('select id as "requestId" from dreamcatcher_generation_requests where round_id=$1',[r2.id])
await db.query('select dispatch_dreamcatcher_generation($1,$2)',[c2.requestId,['batch-one']])
assert.deepEqual((await one('select payload from cosmo_requests order by id desc limit 1')).payload,{puzzleType:'visual_match',tiles:[{assetId:'a',votes:1},{assetId:'b',votes:0}]})
assert.equal((await one('select complete_dreamcatcher_generation($1,$2) as accepted',[c2.requestId,result])).accepted,false,'Old batch cannot become the next round')
await db.query('select complete_dreamcatcher_generation($1,$2)',[c2.requestId,{...result,sessionId:'batch-two'}])
await db.query("update dreamcatcher_rounds set presentation_ready_at=now()-interval '1 minute' where id=$1",[r2.id])
await db.exec('select advance_dreamcatcher_rounds()')
const rr=await one('select * from dreamcatcher_rounds where id=$1',[r2.id])
const a2=await one('select id from signal_task_assets where task_id=$1 limit 1',[rr.task_id])
await db.query("update worlds set vote_scope='voters',discoverer_id=$2 where id=$1",[wid,voter])
await db.query("update dreamcatcher_rounds set closes_at=now()-interval '1 second' where id=$1",[r2.id])
for (const user of [voter,architect]) await assert.rejects(db.query('select respond_dreamcatcher_round($1,$2,$3)',[rr.task_id,a2.id,user]),/original submitter/)
// No cron needed to narrow permissions and let the original owner continue.
await db.query('select respond_dreamcatcher_round($1,$2,$3)',[rr.task_id,a2.id,owner])
await db.query('select respond_dreamcatcher_round($1,$2,$3)',[rr.task_id,a2.id,owner])
assert.equal((await one('select count(*)::int as n from dreamcatcher_rounds where world_id=$1',[wid])).n,3)
assert.equal((await one('select claim_dreamcatcher_notification() as n')).n,null,'Expired fallback must not send new-image mail')
assert.equal((await one('select settlement_reason from dreamcatcher_rounds where id=$1',[r2.id])).settlement_reason,'initiator_fallback')
const c3=await one('select q.id as "requestId" from dreamcatcher_generation_requests q join dreamcatcher_rounds r on r.id=q.round_id where r.world_id=$1 and r.round_number=3',[wid])
await db.query('select dispatch_dreamcatcher_generation($1,$2)',[c3.requestId,['batch-one','batch-two']])
await db.query('select stop_dreamcatcher_world($1,$2)',[wid,owner])
assert.equal((await one('select dispatch_dreamcatcher_generation($1,$2) as id',[c3.requestId,[]])).id,null)
assert.equal((await one('select complete_dreamcatcher_generation($1,$2) as accepted',[c3.requestId,{...result,sessionId:'batch-three'}])).accepted,false)
await assert.rejects(db.query('insert into signal_responses(task_id,user_id,selected_asset_id) values($1,$2,$3)',[rr.task_id,architect,a2.id]),/response action/)
assert.equal((await one("select has_function_privilege('authenticated','respond_dreamcatcher_round(uuid,uuid,uuid)','execute') as allowed")).allowed,false)
// A paused device accepts generation but never begins the front-end work period.
const pausedWorld=await submit(voter,'london-01','10000000-0000-4000-8000-000000000002')
await db.exec('select advance_dreamcatcher_rounds(); select advance_dreamcatcher_jobs()')
const paused=await one('select * from dreamcatcher_rounds where world_id=$1',[pausedWorld])
assert.equal(paused.status,'waiting_capacity')
const pausedClaim=await one('select id as "requestId" from dreamcatcher_generation_requests where round_id=$1',[paused.id])
await db.query('select dispatch_dreamcatcher_generation($1,$2)',[pausedClaim.requestId,[]])
await db.query('select complete_dreamcatcher_generation($1,$2)',[pausedClaim.requestId,result])
await db.exec('select advance_dreamcatcher_rounds()')
assert.equal((await one('select status from dreamcatcher_rounds where id=$1',[paused.id])).status,'waiting_capacity')
await db.exec("update dreamcatchers set status='idle' where slug='london-01'; select advance_dreamcatcher_rounds()")
await db.query("update dreamcatcher_rounds set presentation_ready_at=now()-interval '1 minute' where id=$1",[paused.id])
await db.exec('select advance_dreamcatcher_rounds()')
for (let attempt=1;attempt<=3;attempt++) {
  const failedNotice=(await one('select claim_dreamcatcher_notification() as n')).n
  assert.equal(failedNotice.roundId,paused.id)
  await db.query('select finish_dreamcatcher_notification($1,$2,null,$3)',[paused.id,failedNotice.leaseToken,'Provider temporarily unavailable'])
  await db.query("update dreamcatcher_notifications set available_at=now()-interval '1 minute' where round_id=$1",[paused.id])
}
assert.equal((await one('select status from dreamcatcher_notifications where round_id=$1',[paused.id])).status,'failed')
assert.equal((await one('select claim_dreamcatcher_notification() as n')).n,null,'Three failures stop mail retries')
await db.query("update dreamcatcher_rounds set closes_at=now()-interval '1 second' where id=$1",[paused.id])
await db.exec('select advance_dreamcatcher_rounds()')
assert.equal((await one('select status from dreamcatcher_rounds where id=$1',[paused.id])).status,'awaiting_initiator_feedback')
assert.equal((await one('select count(*)::int as n from dreamcatcher_rounds where world_id=$1',[pausedWorld])).n,1)
// End of presentation releases the device even if assets have not arrived.
const lateWorld=await submit(architect,'tokyo-01','10000000-0000-4000-8000-000000000003')
await db.exec('select advance_dreamcatcher_rounds()')
const late=await one('select * from dreamcatcher_rounds where world_id=$1',[lateWorld])
await db.query("update dreamcatcher_rounds set presentation_ready_at=now()-interval '1 minute' where id=$1",[late.id])
await db.exec('select advance_dreamcatcher_rounds()')
assert.equal((await one('select status from dreamcatcher_rounds where id=$1',[late.id])).status,'awaiting_assets')
assert.equal((await one("select status from dreamcatchers where slug='tokyo-01'")).status,'idle')
assert.equal((await one('select count(*)::int as n from signal_tasks where dreamcatcher_round_id=$1',[late.id])).n,0)
// Direct authoring cannot publish/rewrite/delete generated results.
await assert.rejects(db.query("update signal_tasks set is_published=false where id=$1",[r.task_id]),/managed by Dreamcatcher/)
// Queue capacity includes newly accepted requests before cron has admitted them.
await db.exec("update dreamcatchers set queue_capacity=1 where slug='mexico-city-03'")
await submit(owner,'mexico-city-03','10000000-0000-4000-8000-000000000004')
await assert.rejects(submit(voter,'mexico-city-03','10000000-0000-4000-8000-000000000005'),/queue is full/)
// Restoring the intake state must not revive stopped worlds or accept later-round regressions.
await db.query("update worlds set lifecycle_state='stable' where id=$1",[lateWorld])
await db.exec('select advance_dreamcatcher_rounds()')
assert.equal((await one('select status from dreamcatcher_rounds where id=$1',[late.id])).status,'cancelled')
const ordinary=(await one("select create_observation_world($1,'Old entry','Old English','Legacy description','Owner','#1a1a2e','#16213e',now()+interval '8 hours',null) id",[owner])).id
assert.notEqual(ordinary,wid)
assert.equal((await one('select lifecycle_state from worlds where id=$1',[ordinary])).lifecycle_state,'proposed')
assert.equal((await one('select count(*)::int n from dreamcatcher_rounds where world_id=$1',[ordinary])).n,0,'Legacy entry does not silently enroll in new rounds')
console.log('PASS: legacy shared intake; bootstrap-only promotion; migration; hidden pre-generation; 24h voting; immutable owner fallback; idempotency; feedback history; Cosmo command deduplication and session fencing; device pause; late assets; queue capacity; protected content and RPC permissions')
await db.close()
