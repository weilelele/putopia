// Disposable in-memory PostgreSQL. Requires @electric-sql/pglite outside the app.
// Usage: node scripts/test-voyager-feed-sql.mjs /absolute/path/to/pglite/dist/index.js
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.argv[2] || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth,storage to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create type public.user_role as enum('guest','applicant','voyager','architect');
create table public.voyager_profiles(id uuid primary key,role public.user_role,registered_at timestamptz,display_name text,avatar_url text);
grant select on public.voyager_profiles to authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
insert into public.voyager_profiles values
 ('10000000-0000-4000-8000-000000000001','voyager',now(),'Voyager',null),
 ('10000000-0000-4000-8000-000000000002','applicant',now(),'Applicant',null),
 ('10000000-0000-4000-8000-000000000003','architect',now(),'Architect',null),
 ('10000000-0000-4000-8000-000000000004','voyager',null,'Unregistered',null);
`)
await db.exec(await readFile(new URL('../supabase/schema_v99.sql', import.meta.url),'utf8'))
await db.exec(`alter table voyager_profiles add column account_kind text not null default 'human'; insert into voyager_profiles(id,role,registered_at,display_name,account_kind) values ('10000000-0000-4000-8000-000000000005','architect',now(),'NPC','npc'),('10000000-0000-4000-8000-000000000006','architect',now(),'Second architect','human');`)
await db.exec(`insert into voyager_feed_entries(id,author_id,body) values('20000000-0000-4000-8000-000000000099','10000000-0000-4000-8000-000000000001','Pre-migration post')`)
const beforeMigration = (await db.query(`select updated_at from voyager_feed_entries where id='20000000-0000-4000-8000-000000000099'`)).rows[0].updated_at
await db.exec(await readFile(new URL('../supabase/schema_v100.sql', import.meta.url),'utf8'))
const migrated = (await db.query(`select creator_id,author_id,updated_at from voyager_feed_entries where id='20000000-0000-4000-8000-000000000099'`)).rows[0]
assert.equal(migrated.creator_id,migrated.author_id)
assert.deepEqual(migrated.updated_at,beforeMigration)
await db.exec(`delete from voyager_feed_entries where id='20000000-0000-4000-8000-000000000099'`)

const ids = [1,2,3,4,5,6].map(n=>`10000000-0000-4000-8000-00000000000${n}`)
const post='20000000-0000-4000-8000-000000000001', reply='20000000-0000-4000-8000-000000000002'
const as = async n => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n ? ids[n-1] : '']); await db.exec(n ? 'set role authenticated' : 'set role anon') }
let checks=2
const denied = async sql => { await assert.rejects(()=>db.exec(sql)); checks++ }
const count = async (sql,expected) => { assert.equal((await db.query(sql)).rows.length,expected); checks++ }
await as(1)
await db.exec(`insert into storage.objects(bucket_id,name) values('voyager-feed','${ids[0]}/${post}.png'); insert into voyager_feed_entries(id,author_id,body,image_path) values('${post}','${ids[0]}','Hello','${ids[0]}/${post}.png')`)
await count('select * from voyager_feed_view',1)
await count('select * from storage.objects',1)
await as(2)
await count('select * from voyager_feed_view',1)
await denied(`insert into voyager_feed_entries(id,author_id,body) values(gen_random_uuid(),'${ids[1]}','Not allowed')`)
await db.exec(`insert into voyager_feed_entries(id,author_id,parent_id,body) values('${reply}','${ids[1]}','${post}','Reply'); insert into voyager_feed_likes(entry_id,user_id) values('${post}','${ids[1]}')`)
assert.deepEqual((await db.query(`select like_count::int,reply_count::int,liked from voyager_feed_view where id='${post}'`)).rows[0],{like_count:1,reply_count:1,liked:true}); checks++
await count(`update voyager_feed_entries set body='stolen' where id='${post}' returning id`,0)
await count(`update voyager_feed_entries set body='Own edit' where id='${reply}' returning id`,1)
await denied(`update voyager_feed_entries set author_id='${ids[0]}' where id='${reply}'`)
await denied(`insert into voyager_feed_entries(id,author_id,parent_id,body) values(gen_random_uuid(),'${ids[1]}','${reply}','Nested reply')`)
await denied(`insert into storage.objects(bucket_id,name) values('voyager-feed','${ids[1]}/forbidden.png')`)
await as(3)
await count(`delete from voyager_feed_entries where id='${post}' returning id`,0)
await count(`update voyager_feed_entries set body='stolen' where id='${reply}' returning id`,0)
await denied(`insert into voyager_feed_entries(id,author_id,body) values(gen_random_uuid(),'${ids[0]}','Forged')`)
await as(4)
await count('select * from voyager_feed_view',0)
await count('select * from storage.objects',0)
await denied(`insert into voyager_feed_entries(id,author_id,body) values(gen_random_uuid(),'${ids[3]}','Unregistered')`)
await denied(`insert into voyager_feed_likes(entry_id,user_id) values('${post}','${ids[3]}')`)
await as(0)
await denied('select * from voyager_feed_view')
await denied('select * from voyager_feed_entries')
await as(1)
await db.exec(`delete from voyager_feed_entries where id='${post}'`)
await count('select * from voyager_feed_entries',0)
await count('select * from voyager_feed_likes',0)
await count('select * from storage.objects',0)
await db.exec(`insert into voyager_feed_entries(id,author_id,body) values('${post}','${ids[0]}','Account deletion test')`)
await as(3)
await db.exec(`insert into voyager_feed_likes(entry_id,user_id) values('${post}','${ids[2]}')`)
await db.exec('reset role')
await db.exec(`delete from voyager_profiles where id='${ids[0]}'`)
await count('select * from voyager_feed_entries',0)
await count('select * from voyager_feed_likes',0)
// NPC attribution is distinct from the authenticated creator.
const npcPost='20000000-0000-4000-8000-000000000003'
await as(3)
await db.exec(`insert into voyager_feed_entries(id,author_id,body,image_path) values('${npcPost}','${ids[4]}','NPC post','${ids[2]}/npc.png')`)
await count(`select * from voyager_feed_view where id='${npcPost}' and author_id='${ids[4]}' and can_manage`,1)
await count(`update voyager_feed_entries set body='NPC updated' where id='${npcPost}' returning id`,1)
await denied(`update voyager_feed_entries set creator_id='${ids[5]}' where id='${npcPost}'`)
await denied(`insert into voyager_feed_entries(author_id,creator_id,body) values('${ids[4]}','${ids[5]}','Forged creator')`)
await denied(`insert into voyager_feed_entries(author_id,body,image_path) values('${ids[4]}','Wrong image owner','${ids[4]}/image.png')`)
await denied(`insert into voyager_feed_entries(author_id,parent_id,body) values('${ids[4]}','${npcPost}','NPC reply')`)
await denied(`insert into voyager_feed_entries(author_id,body) values('${ids[5]}','Impersonate human')`)
await as(6)
await count(`update voyager_feed_entries set body='Stolen' where id='${npcPost}' returning id`,0)
await count(`delete from voyager_feed_entries where id='${npcPost}' returning id`,0)
await as(5)
await count(`select * from voyager_feed_view where id='${npcPost}' and can_manage`,0)
await count(`delete from voyager_feed_entries where id='${npcPost}' returning id`,0)
await denied(`insert into voyager_feed_entries(author_id,body) values('${ids[5]}','NPC impersonating human')`)
await as(2)
await denied(`insert into voyager_feed_entries(author_id,body) values('${ids[4]}','Applicant impersonating NPC')`)
await db.exec('reset role')
await db.exec(`update voyager_profiles set role='voyager' where id='${ids[5]}'`)
await as(6)
await denied(`insert into voyager_feed_entries(author_id,body) values('${ids[4]}','Voyager impersonating NPC')`)
await as(3)
await count(`delete from voyager_feed_entries where id='${npcPost}' returning id`,1)
await db.close()
console.log(`Passed ${checks} isolated PostgreSQL authorization assertions.`)
