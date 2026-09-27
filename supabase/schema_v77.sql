-- Dreamcatcher rounds: private pre-generation, timed presentation and 24h voting.
-- Additive. Existing jobs/threads remain legacy; no historical rounds inferred.
begin;
alter table public.dreamcatcher_jobs add column if not exists orchestration text not null default 'legacy_daily'
  check (orchestration in ('legacy_daily','dreamcatcher_rounds'));
alter table public.signal_threads add column if not exists orchestration text not null default 'legacy_daily'
  check (orchestration in ('legacy_daily','dreamcatcher_rounds'));

create table public.dreamcatcher_rounds (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dreamcatcher_jobs(id) on delete cascade,
  world_id text not null references public.worlds(id) on delete cascade,
  dreamcatcher_id uuid not null references public.dreamcatchers(id),
  initiator_id uuid not null references public.voyager_profiles(id),
  round_number integer not null check (round_number > 0),
  status text not null default 'waiting_capacity' check (status in ('waiting_capacity','queued','processing','awaiting_assets','voting_open','awaiting_initiator_feedback','settled','cancelled')),
  task_id uuid unique references public.signal_tasks(id),
  requested_at timestamptz not null default now(),
  queued_at timestamptz,
  processing_started_at timestamptz,
  presentation_ready_at timestamptz,
  opened_at timestamptz,
  closes_at timestamptz,
  settled_at timestamptz,
  settlement_reason text check (settlement_reason in ('window_closed','initiator_fallback')),
  feedback jsonb,
  unique (world_id, round_number)
);
create unique index dreamcatcher_rounds_one_active on public.dreamcatcher_rounds(world_id)
  where status not in ('settled','cancelled');
create unique index dreamcatcher_rounds_one_processing on public.dreamcatcher_rounds(dreamcatcher_id)
  where status = 'processing';
create index dreamcatcher_rounds_queue on public.dreamcatcher_rounds(dreamcatcher_id,status,requested_at);
alter table public.signal_tasks add column if not exists dreamcatcher_round_id uuid unique references public.dreamcatcher_rounds(id);

-- Private round bookkeeping. Cosmo still consumes the existing cosmo_requests table.
create table public.dreamcatcher_generation_requests (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null unique references public.dreamcatcher_rounds(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','ready','failed','cancelled')),
  input jsonb not null,
  result jsonb,
  attempt integer not null default 0,
  cosmo_request_id bigint unique references public.cosmo_requests(id),
  baseline_sessions jsonb not null default '[]',
  last_polled_at timestamptz,
  available_at timestamptz not null default now(),
  ready_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index dreamcatcher_generation_pending on public.dreamcatcher_generation_requests(status,available_at);
create table public.dreamcatcher_submissions (
  user_id uuid not null references public.voyager_profiles(id) on delete cascade,
  submission_key uuid not null,
  world_id text not null references public.worlds(id) on delete cascade,
  primary key(user_id,submission_key)
);
alter table public.dreamcatcher_rounds enable row level security;
alter table public.dreamcatcher_generation_requests enable row level security;
alter table public.dreamcatcher_submissions enable row level security;
revoke all on public.dreamcatcher_rounds, public.dreamcatcher_generation_requests, public.dreamcatcher_submissions from public,anon,authenticated;
grant all on public.dreamcatcher_rounds, public.dreamcatcher_generation_requests, public.dreamcatcher_submissions to service_role;

-- Publication creates exactly one owner-only notification; no historical backfill.
create table public.dreamcatcher_notifications (
  round_id uuid primary key references public.dreamcatcher_rounds(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),
  attempt integer not null default 0,
  lease_token uuid, lease_until timestamptz,
  available_at timestamptz not null default now(),
  sent_at timestamptz, provider_id text, last_error text
);
alter table public.dreamcatcher_notifications enable row level security;
revoke all on public.dreamcatcher_notifications from public,anon,authenticated;
grant all on public.dreamcatcher_notifications to service_role;

-- All transitions use the same advisory lock, including answer/sync races.
-- Functions are invoker-only and callable only by the trusted application role.
create function public.dreamcatcher_enqueue_generation(p_round uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare r public.dreamcatcher_rounds; w public.worlds; prior jsonb;
begin
  select * into strict r from public.dreamcatcher_rounds where id=p_round;
  select * into strict w from public.worlds where id=r.world_id;
  select coalesce(jsonb_agg(jsonb_build_object('roundNumber',round_number,'feedback',feedback) order by round_number),'[]') into prior
    from public.dreamcatcher_rounds where world_id=r.world_id and status='settled';
  insert into public.dreamcatcher_generation_requests(round_id,input) values(r.id,jsonb_build_object(
    'roundId',r.id,'worldId',r.world_id,'roundNumber',r.round_number,
    'dream',jsonb_build_object('name',w.name,'description',w.description),'history',prior))
  on conflict(round_id) do nothing;
end $$;

create function public.submit_dreamcatcher_round_world(p_user uuid,p_slug text,p_name text,p_description text,p_key uuid)
returns text language plpgsql security invoker set search_path = public as $$
declare room public.dreamcatchers; person public.voyager_profiles; wid text; tid uuid; jid uuid; rid uuid;
begin
  perform pg_advisory_xact_lock(770027);
  select world_id into wid from public.dreamcatcher_submissions where user_id=p_user and submission_key=p_key;
  if wid is not null then return wid; end if;
  select * into person from public.voyager_profiles where id=p_user;
  if person.id is null or person.role not in ('applicant','voyager','architect') then raise exception 'Applicant access required'; end if;
  if length(trim(p_name)) not between 1 and 80 or length(trim(p_description)) not between 20 and 2000 then raise exception 'Invalid observation'; end if;
  select * into room from public.dreamcatchers where slug=p_slug and is_public for update;
  if room.id is null or room.status='offline' then raise exception 'This Parallax Array is unavailable'; end if;
  if (select count(*) from public.dreamcatcher_jobs where dreamcatcher_id=room.id and status in ('queued','returning')) + (select count(*) from public.dreamcatcher_rounds where dreamcatcher_id=room.id and status='waiting_capacity') >= room.queue_capacity then raise exception 'Parallax Array queue is full'; end if;
  wid := 'PROP-' || upper(replace(gen_random_uuid()::text,'-',''));
  insert into public.worlds(id,name,name_en,description,discoverer_id,discoverer_name,submitted_by,submitted_at,discovery_date,
    gradient_from,gradient_to,lifecycle_state,is_verified,dreamcatcher_id,vote_scope)
  values(wid,trim(p_name),trim(p_name),trim(p_description),p_user,coalesce(nullif(trim(person.display_name),''),'Operative'),p_user,now(),current_date,
    '#1a1a2e','#16213e','syncing',false,room.id,'all');
  insert into public.signal_threads(world_id,type,created_by,orchestration) values(wid,'visual_match',p_user,'dreamcatcher_rounds') returning id into tid;
  insert into public.dreamcatcher_jobs(dreamcatcher_id,world_id,submitted_by,status,round_number,round_duration_minutes,signal_thread_id,orchestration)
    values(room.id,wid,p_user,'awaiting_dispatch',1,room.round_duration_minutes,tid,'dreamcatcher_rounds') returning id into jid;
  insert into public.dreamcatcher_rounds(job_id,world_id,dreamcatcher_id,initiator_id,round_number)
    values(jid,wid,room.id,p_user,1) returning id into rid;
  insert into public.dreamcatcher_submissions values(p_user,p_key,wid);
  perform public.dreamcatcher_enqueue_generation(rid);
  return wid;
end $$;

create function public.settle_dreamcatcher_round(p_round uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare r public.dreamcatcher_rounds; n integer; next_id uuid; result jsonb;
begin
  perform pg_advisory_xact_lock(770027);
  select * into r from public.dreamcatcher_rounds where id=p_round for update;
  if r.id is null or r.status not in ('voting_open','awaiting_initiator_feedback') or r.closes_at > clock_timestamp() then return false; end if;
  select count(*) into n from public.signal_responses where task_id=r.task_id;
  if n=0 then
    update public.dreamcatcher_rounds set status='awaiting_initiator_feedback' where id=r.id;
    return false;
  end if;
  select jsonb_build_object('puzzleType','visual_match','participants',n,'tiles',jsonb_agg(jsonb_build_object('assetId',a.source_asset_id,'votes',
    (select count(*) from public.signal_responses s where s.task_id=r.task_id and s.selected_asset_id=a.id)) order by a.display_order)) into result
    from public.signal_task_assets a where a.task_id=r.task_id and a.is_selected and a.asset_role='option';
  update public.dreamcatcher_rounds set status='settled',settled_at=clock_timestamp(),feedback=result,
    settlement_reason=case when exists(select 1 from public.signal_responses where task_id=r.task_id and created_at>=r.closes_at) then 'initiator_fallback' else 'window_closed' end where id=r.id;
  update public.dreamcatcher_jobs set status='awaiting_dispatch',round_number=r.round_number+1,processing_started_at=null,estimated_ready_at=null,updated_at=now() where id=r.job_id;
  insert into public.dreamcatcher_rounds(job_id,world_id,dreamcatcher_id,initiator_id,round_number)
    values(r.job_id,r.world_id,r.dreamcatcher_id,r.initiator_id,r.round_number+1) returning id into next_id;
  perform public.dreamcatcher_enqueue_generation(next_id);
  return true;
end $$;

create function public.respond_dreamcatcher_round(p_task uuid,p_asset uuid,p_user uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare r public.dreamcatcher_rounds; w public.worlds; role_name text; prior uuid; n integer; advanced boolean:=false; decision_at timestamptz;
begin
  perform pg_advisory_xact_lock(770027);
  decision_at:=clock_timestamp();
  select * into r from public.dreamcatcher_rounds where task_id=p_task for update;
  if r.id is null then raise exception 'Round not found'; end if;
  select selected_asset_id into prior from public.signal_responses where task_id=p_task and user_id=p_user;
  if prior is not null then
    if prior<>p_asset then raise exception 'Your response is already recorded'; end if;
    return jsonb_build_object('advanced',r.status='settled');
  end if;
  if r.status not in ('voting_open','awaiting_initiator_feedback') or r.opened_at is null then raise exception 'This round is not accepting responses'; end if;
  select * into w from public.worlds where id=r.world_id;
  if w.lifecycle_state<>'syncing' then raise exception 'This exploration has ended'; end if;
  select role::text into role_name from public.voyager_profiles where id=p_user;
  if role_name is null then raise exception 'Please log in first'; end if;
  if decision_at>=r.closes_at then
    select count(*) into n from public.signal_responses where task_id=p_task;
    if n<>0 or p_user<>r.initiator_id then raise exception 'Voting closed. Only the original submitter can continue an unanswered round'; end if;
  elsif not (role_name='architect' or w.vote_scope='all' or (w.vote_scope='self' and p_user=w.discoverer_id) or (w.vote_scope='voters' and role_name='voyager')) then
    raise exception 'You are not eligible to vote on this world';
  end if;
  if not exists(select 1 from public.signal_task_assets where id=p_asset and task_id=p_task and is_selected and asset_role='option') then raise exception 'Invalid signal'; end if;
  perform set_config('app.dreamcatcher_response',r.id::text,true);
  insert into public.signal_responses(task_id,user_id,selected_asset_id,created_at) values(p_task,p_user,p_asset,decision_at);
  if decision_at>=r.closes_at then advanced:=public.settle_dreamcatcher_round(r.id); end if;
  return jsonb_build_object('advanced',advanced);
end $$;

create function public.guard_dreamcatcher_response() returns trigger
language plpgsql security invoker set search_path=public as $$
declare rid uuid;
begin
  select dreamcatcher_round_id into rid from public.signal_tasks where id=coalesce(new.task_id,old.task_id);
  if rid is not null and current_setting('app.dreamcatcher_response',true) is distinct from rid::text then raise exception 'Use the Dreamcatcher response action'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger dreamcatcher_response_guard before insert or update or delete on public.signal_responses for each row execute function public.guard_dreamcatcher_response();

create function public.advance_dreamcatcher_rounds() returns void
language plpgsql security invoker set search_path=public as $$
declare r public.dreamcatcher_rounds; room public.dreamcatchers; req public.dreamcatcher_generation_requests; tid uuid; aid jsonb; occupied integer; publication_at timestamptz;
begin
  perform pg_advisory_xact_lock(770027);
  -- Cancellation covers graduation and stopped jobs, including late results.
  update public.dreamcatcher_rounds x set status='cancelled' from public.worlds w,public.dreamcatcher_jobs j
    where x.world_id=w.id and x.job_id=j.id and x.status not in ('settled','cancelled') and (w.lifecycle_state<>'syncing' or j.status in ('withdrawn','completed'));
  update public.dreamcatcher_generation_requests q set status='cancelled'
    from public.dreamcatcher_rounds x where q.round_id=x.id and x.status='cancelled' and q.status<>'cancelled';
  update public.dreamcatcher_jobs j set status='completed',completed_at=now() from public.worlds w where j.world_id=w.id and j.orchestration='dreamcatcher_rounds' and w.lifecycle_state='stable' and j.status<>'completed';
  for r in select * from public.dreamcatcher_rounds where status='voting_open' and closes_at<=clock_timestamp() loop
    perform public.settle_dreamcatcher_round(r.id);
  end loop;
  update public.dreamcatcher_rounds set status='awaiting_assets' where status='processing' and presentation_ready_at<=clock_timestamp();
  update public.dreamcatcher_jobs j set status='awaiting_dispatch' from public.dreamcatcher_rounds x where x.job_id=j.id and x.status='awaiting_assets' and j.status='processing';
  for r in select x.* from public.dreamcatcher_rounds x join public.dreamcatcher_generation_requests q on q.round_id=x.id
      where x.status='awaiting_assets' and q.status='ready' loop
    select * into req from public.dreamcatcher_generation_requests where round_id=r.id;
    publication_at:=clock_timestamp();
    perform set_config('app.dreamcatcher_publish',r.id::text,true);
    insert into public.signal_tasks(thread_id,day_index,type,prompt,task_date,is_published,published_at,dreamcatcher_round_id,cosmo_session_id)
      select signal_thread_id,r.round_number-1,'visual_match',coalesce(req.result->>'prompt','Which signal feels most true to this world?'),current_date,true,publication_at,r.id,req.result->>'sessionId'
      from public.dreamcatcher_jobs where id=r.job_id returning id into tid;
    for aid in select value from jsonb_array_elements(req.result->'assets') loop
      insert into public.signal_task_assets(task_id,media,source_asset_id,source_url,processed_url,processed_path,display_url,asset_role,is_selected,display_order)
        values(tid,(aid->>'media')::public.signal_asset_media,aid->>'assetId',aid->>'url',coalesce(aid->>'processedUrl',aid->>'url'),aid->>'processedPath',aid->>'posterUrl','option',true,(aid->>'order')::integer);
    end loop;
    update public.dreamcatcher_rounds set status='voting_open',task_id=tid,opened_at=publication_at,closes_at=publication_at+interval '24 hours' where id=r.id;
    update public.dreamcatcher_jobs set status='awaiting_vote',updated_at=now() where id=r.job_id;
    insert into public.dreamcatcher_notifications(round_id) values(r.id) on conflict do nothing;
  end loop;
  -- Shared capacity/working slot with any surviving legacy jobs.
  for room in select * from public.dreamcatchers where is_public and status not in ('offline','paused') for update loop
    select count(*) into occupied from public.dreamcatcher_jobs where dreamcatcher_id=room.id and status in ('queued','returning');
    for r in select * from public.dreamcatcher_rounds where dreamcatcher_id=room.id and status='waiting_capacity' order by requested_at,id limit greatest(0,room.queue_capacity-occupied) loop
      update public.dreamcatcher_rounds set status='queued',queued_at=clock_timestamp() where id=r.id;
      update public.dreamcatcher_jobs set status='queued',queued_at=clock_timestamp(),updated_at=now() where id=r.job_id;
    end loop;
    if not exists(select 1 from public.dreamcatcher_jobs where dreamcatcher_id=room.id and status='processing') then
      select x.* into r from public.dreamcatcher_rounds x where x.dreamcatcher_id=room.id and x.status='queued' order by x.queued_at,x.id limit 1;
      if found then
        update public.dreamcatcher_rounds set status='processing',processing_started_at=clock_timestamp(),presentation_ready_at=clock_timestamp()+make_interval(mins=>room.round_duration_minutes) where id=r.id;
        update public.dreamcatcher_jobs set status='processing',processing_started_at=clock_timestamp(),estimated_ready_at=clock_timestamp()+make_interval(mins=>room.round_duration_minutes),updated_at=now() where id=r.job_id;
        update public.dreamcatchers set status='processing',updated_at=now() where id=room.id;
      else
        update public.dreamcatchers set status='idle',updated_at=now() where id=room.id;
      end if;
    end if;
  end loop;
end $$;

-- Bootstrap is checked by the existing read-only Mongo integration before this RPC.
-- Lock + stored request ID makes retries/concurrent crons emit just one command.
create function public.dispatch_dreamcatcher_generation(p_request uuid,p_sessions jsonb) returns bigint
language plpgsql security invoker set search_path=public as $$
declare q public.dreamcatcher_generation_requests; r public.dreamcatcher_rounds; payload jsonb; cid bigint;
begin
  perform pg_advisory_xact_lock(770027);
  select * into q from public.dreamcatcher_generation_requests where id=p_request for update;
  select * into r from public.dreamcatcher_rounds where id=q.round_id;
  if q.id is null or q.status='cancelled' or r.status in ('settled','cancelled') or not exists(select 1 from public.worlds where id=r.world_id and lifecycle_state='syncing') then return null; end if;
  if q.cosmo_request_id is not null then return q.cosmo_request_id; end if;
  if jsonb_typeof(p_sessions) is distinct from 'array' then raise exception 'Invalid session baseline'; end if;
  payload:='{}'::jsonb;
  if r.round_number>1 then
    select jsonb_build_object('puzzleType',feedback->>'puzzleType','tiles',feedback->'tiles') into payload
      from public.dreamcatcher_rounds where world_id=r.world_id and round_number=r.round_number-1 and status='settled';
    if payload is null then raise exception 'Previous round is not settled'; end if;
  end if;
  perform set_config('app.dreamcatcher_request','round',true);
  insert into public.cosmo_requests(world_id,type,payload) values(r.world_id,'expansion',payload) returning id into cid;
  update public.dreamcatcher_generation_requests set cosmo_request_id=cid,baseline_sessions=p_sessions,status='running',attempt=1,last_error=null where id=q.id;
  return cid;
end $$;

create function public.complete_dreamcatcher_generation(p_request uuid,p_result jsonb) returns boolean
language plpgsql security invoker set search_path=public as $$
declare q public.dreamcatcher_generation_requests; r public.dreamcatcher_rounds; a jsonb;
begin
  perform pg_advisory_xact_lock(770027);
  select * into q from public.dreamcatcher_generation_requests where id=p_request for update;
  select * into r from public.dreamcatcher_rounds where id=q.round_id;
  if q.id is null or q.cosmo_request_id is null or q.status not in ('running','failed','ready') then return false; end if;
  if r.status='cancelled' or not exists(select 1 from public.worlds where id=r.world_id and lifecycle_state='syncing') then return false; end if;
  if q.status='ready' then return q.result->>'sessionId'=p_result->>'sessionId'; end if;
  if coalesce(p_result->>'sessionId','')='' or q.baseline_sessions ? (p_result->>'sessionId') then return false; end if;
  if exists(select 1 from public.dreamcatcher_generation_requests other join public.dreamcatcher_rounds prior on prior.id=other.round_id
    where prior.world_id=r.world_id and other.id<>q.id and other.result->>'sessionId'=p_result->>'sessionId') then return false; end if;
  if jsonb_typeof(p_result->'assets') is distinct from 'array' then raise exception 'Invalid assets'; end if;
  if jsonb_array_length(p_result->'assets') not between 2 and 8 then raise exception 'Expected 2 to 8 signals'; end if;
  if (select count(distinct value->>'assetId') from jsonb_array_elements(p_result->'assets')) <> jsonb_array_length(p_result->'assets') then raise exception 'Duplicate assets'; end if;
  for a in select value from jsonb_array_elements(p_result->'assets') loop
    if coalesce(a->>'media','') not in ('image','video') or coalesce(a->>'url','') !~ '^https://' or coalesce(a->>'assetId','')='' then raise exception 'Invalid signal asset'; end if;
  end loop;
  update public.dreamcatcher_generation_requests set status='ready',result=p_result,ready_at=clock_timestamp(),last_error=null where id=q.id;
  return true;
end $$;

create function public.stop_dreamcatcher_world(p_world text,p_user uuid) returns void
language plpgsql security invoker set search_path=public as $$
begin
  perform pg_advisory_xact_lock(770027);
  if not exists(select 1 from public.dreamcatcher_jobs where world_id=p_world and submitted_by=p_user and orchestration='dreamcatcher_rounds') then raise exception 'Only the original submitter can end this exploration'; end if;
  update public.dreamcatcher_jobs set status='withdrawn',completed_at=now() where world_id=p_world and orchestration='dreamcatcher_rounds';
  update public.dreamcatcher_rounds set status='cancelled' where world_id=p_world and status not in ('settled','cancelled');
  update public.dreamcatcher_generation_requests q set status='cancelled' from public.dreamcatcher_rounds r where q.round_id=r.id and r.world_id=p_world and r.status='cancelled';
end $$;

create function public.guard_dreamcatcher_content() returns trigger
language plpgsql security invoker set search_path=public as $$
declare rid uuid;
begin
  if tg_table_name='signal_tasks' then
    if tg_op='INSERT' then rid:=new.dreamcatcher_round_id;
    else rid:=old.dreamcatcher_round_id; end if;
  else
    select dreamcatcher_round_id into rid from public.signal_tasks where id=coalesce(new.task_id,old.task_id);
  end if;
  if rid is not null and current_setting('app.dreamcatcher_publish',true) is distinct from rid::text then raise exception 'Round content is managed by Dreamcatcher'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger dreamcatcher_task_guard before insert or update or delete on public.signal_tasks for each row execute function public.guard_dreamcatcher_content();
create trigger dreamcatcher_asset_guard before insert or update or delete on public.signal_task_assets for each row execute function public.guard_dreamcatcher_content();

-- Recovery retries the read/sync, never blindly purchases another Cosmo batch.
create function public.retry_dreamcatcher_generation(p_request uuid) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
  perform pg_advisory_xact_lock(770027);
  update public.dreamcatcher_generation_requests q set status=case when cosmo_request_id is null then 'pending' else 'running' end,last_error=null,available_at=clock_timestamp()
    from public.dreamcatcher_rounds r, public.worlds w
    where q.id=p_request and q.round_id=r.id and r.world_id=w.id and w.lifecycle_state='syncing'
      and q.status='failed' and r.status not in ('settled','cancelled');
  return found;
end $$;

create function public.claim_dreamcatcher_notification() returns jsonb
language plpgsql security invoker set search_path=public as $$
declare n public.dreamcatcher_notifications; r public.dreamcatcher_rounds; w public.worlds;
begin
  perform pg_advisory_xact_lock(770027);
  update public.dreamcatcher_notifications x set status='cancelled',lease_token=null from public.dreamcatcher_rounds y,public.worlds z
    where x.round_id=y.id and z.id=y.world_id and x.status in ('pending','sending')
    and (y.status<>'voting_open' or y.closes_at<=clock_timestamp() or z.lifecycle_state<>'syncing');
  update public.dreamcatcher_notifications set status='failed',lease_token=null,last_error='Delivery lease expired'
    where status='sending' and lease_until<clock_timestamp() and attempt>=3;
  select * into n from public.dreamcatcher_notifications where attempt<3 and
    ((status='pending' and available_at<=clock_timestamp()) or (status='sending' and lease_until<clock_timestamp()))
    order by available_at,round_id limit 1 for update skip locked;
  if n.round_id is null then return null; end if;
  update public.dreamcatcher_notifications set status='sending',attempt=attempt+1,lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes'
    where round_id=n.round_id returning * into n;
  select * into strict r from public.dreamcatcher_rounds where id=n.round_id;
  select * into strict w from public.worlds where id=r.world_id;
  return jsonb_build_object('roundId',r.id,'worldId',r.world_id,'worldName',w.name,'arrayName',(select name from public.dreamcatchers where id=r.dreamcatcher_id),'roundNumber',r.round_number,'initiatorId',r.initiator_id,'closesAt',r.closes_at,'leaseToken',n.lease_token);
end $$;

create function public.finish_dreamcatcher_notification(p_round uuid,p_lease uuid,p_provider text,p_error text) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
  perform pg_advisory_xact_lock(770027);
  update public.dreamcatcher_notifications set
    status=case when p_error is null then 'sent' when attempt<3 then 'pending' else 'failed' end,
    sent_at=case when p_error is null then clock_timestamp() else null end,
    provider_id=p_provider,last_error=left(p_error,500),lease_token=null,lease_until=null,
    available_at=clock_timestamp()+interval '5 minutes'
    where round_id=p_round and lease_token=p_lease and status='sending';
  return found;
end $$;

-- Prevent direct response/table writes from bypassing the new state machine.
-- RPCs accept an authenticated user id from the server and are never public APIs.
do $$ declare f record; begin
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in (
    'dreamcatcher_enqueue_generation','submit_dreamcatcher_round_world','settle_dreamcatcher_round','respond_dreamcatcher_round',
    'claim_dreamcatcher_notification','finish_dreamcatcher_notification',
    'retry_dreamcatcher_generation','guard_dreamcatcher_response','guard_dreamcatcher_content','advance_dreamcatcher_rounds','dispatch_dreamcatcher_generation','complete_dreamcatcher_generation','stop_dreamcatcher_world') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;

-- Keep the old queue available without letting it advance new rounds.
create or replace function public.advance_dreamcatcher_jobs(p_now timestamptz default now())
returns table(started integer, finished integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  room record;
  next_job record;
  started_count integer := 0;
  finished_count integer := 0;
begin
  perform pg_advisory_xact_lock(770027);
  -- A published Signal Dispatch day opens community voting for the matching
  -- round. Once its existing 24-hour voting window closes, the same job returns
  -- to its original Dreamcatcher and is prioritised for the next round.
  update public.dreamcatcher_jobs j
  set status = 'awaiting_vote', updated_at = p_now
  where j.orchestration = 'legacy_daily' and j.status = 'awaiting_dispatch'
    and j.signal_thread_id is not null
    and exists (
      select 1 from public.signal_tasks t
      where t.thread_id = j.signal_thread_id
        and t.is_published = true
        and coalesce(t.day_index, 0) + 1 >= j.round_number
    );

  update public.dreamcatcher_jobs j
  set status = 'returning',
      round_number = j.round_number + 1,
      queued_at = p_now,
      processing_started_at = null,
      estimated_ready_at = null,
      updated_at = p_now
  where j.orchestration = 'legacy_daily' and j.status = 'awaiting_vote'
    and j.signal_thread_id is not null
    and exists (
      select 1 from public.signal_tasks t
      where t.thread_id = j.signal_thread_id
        and t.is_published = true
        and coalesce(t.day_index, 0) + 1 >= j.round_number
        and t.published_at + interval '24 hours' <= p_now
    );

  update public.dreamcatcher_jobs
  set status = 'awaiting_dispatch', updated_at = p_now
  where orchestration = 'legacy_daily' and status = 'processing' and estimated_ready_at <= p_now;
  get diagnostics finished_count = row_count;

  for room in select * from public.dreamcatchers where is_public and status not in ('offline','paused') for update loop
    if not exists (
      select 1 from public.dreamcatcher_jobs
      where dreamcatcher_id = room.id and status = 'processing'
    ) then
      select * into next_job
      from public.dreamcatcher_jobs
      where orchestration = 'legacy_daily' and dreamcatcher_id = room.id and status in ('returning', 'queued')
      order by case when status = 'returning' then 0 else 1 end, queued_at
      for update skip locked
      limit 1;

      if found then
        update public.dreamcatcher_jobs
        set status = 'processing',
            processing_started_at = p_now,
            estimated_ready_at = p_now + make_interval(mins => room.round_duration_minutes),
            updated_at = p_now
        where id = next_job.id;
        update public.worlds
        set scan_until = p_now + make_interval(mins => room.round_duration_minutes),
            scan_resolved_at = null
        where id = next_job.world_id;
        update public.dreamcatchers set status = 'processing', updated_at = p_now where id = room.id;
        started_count := started_count + 1;
      else
        update public.dreamcatchers set status = 'idle', updated_at = p_now
        where id = room.id and status <> 'paused';
      end if;
    end if;
  end loop;
  return query select started_count, finished_count;
end;
$$;


commit;
