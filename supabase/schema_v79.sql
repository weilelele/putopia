-- Restore the existing first-submission contract; keep Cosmo's API unchanged.
-- Both submission actions share this service-only insert. Queue/round state is separate.
begin;
create function public.create_observation_world(
  p_user uuid,p_name text,p_name_en text,p_description text,p_discoverer_name text,
  p_gradient_from text,p_gradient_to text,p_scan_until timestamptz,p_dreamcatcher uuid default null
) returns text language plpgsql security invoker set search_path=public as $$
declare wid text; millis bigint; n bigint; suffix text;
begin
  perform pg_advisory_xact_lock(770027);
  if not exists(select 1 from public.voyager_profiles where id=p_user) then raise exception 'Profile not found'; end if;
  -- Same PROP- + uppercase Date.now().toString(36) format as the old entry.
  -- Serialize/check timestamp collisions; the round RPC separately deduplicates submission keys.
  millis:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  loop
    n:=millis; suffix:='';
    loop
      suffix:=substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',(n%36)::integer+1,1)||suffix;
      n:=n/36; exit when n=0;
    end loop;
    wid:='PROP-'||suffix;
    exit when not exists(select 1 from public.worlds where id=wid);
    millis:=millis+1;
  end loop;
  insert into public.worlds(id,name,name_en,description,discoverer_id,discoverer_name,
    submitted_by,submitted_at,discovery_date,gradient_from,gradient_to,image_path,
    lifecycle_state,is_verified,scan_until,dreamcatcher_id,vote_scope)
  values(wid,p_name,p_name_en,p_description,p_user,p_discoverer_name,p_user,clock_timestamp(),
    (clock_timestamp() at time zone 'UTC')::date,p_gradient_from,p_gradient_to,null,
    'proposed',false,p_scan_until,p_dreamcatcher,'all');
  return wid;
end $$;
revoke all on function public.create_observation_world(uuid,text,text,text,text,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.create_observation_world(uuid,text,text,text,text,text,text,timestamptz,uuid) to service_role;
create or replace function public.submit_dreamcatcher_round_world(p_user uuid,p_slug text,p_name text,p_description text,p_key uuid)
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
  wid := public.create_observation_world(p_user,trim(p_name),trim(p_name),trim(p_description),
    coalesce(nullif(trim(person.display_name),''),'Unknown Operative'),'#1a1a2e','#16213e',null,room.id);
  insert into public.signal_threads(world_id,type,created_by,orchestration) values(wid,'visual_match',p_user,'dreamcatcher_rounds') returning id into tid;
  insert into public.dreamcatcher_jobs(dreamcatcher_id,world_id,submitted_by,status,round_number,round_duration_minutes,signal_thread_id,orchestration)
    values(room.id,wid,p_user,'awaiting_dispatch',1,room.round_duration_minutes,tid,'dreamcatcher_rounds') returning id into jid;
  insert into public.dreamcatcher_rounds(job_id,world_id,dreamcatcher_id,initiator_id,round_number)
    values(jid,wid,room.id,p_user,1) returning id into rid;
  insert into public.dreamcatcher_submissions values(p_user,p_key,wid);
  perform public.dreamcatcher_enqueue_generation(rid);
  return wid;
end $$;

create or replace function public.advance_dreamcatcher_rounds() returns void
language plpgsql security invoker set search_path=public as $$
declare r public.dreamcatcher_rounds; room public.dreamcatchers; req public.dreamcatcher_generation_requests; tid uuid; aid jsonb; occupied integer; publication_at timestamptz;
begin
  perform pg_advisory_xact_lock(770027);
  -- Cancellation covers graduation and stopped jobs, including late results.
  update public.dreamcatcher_rounds x set status='cancelled' from public.worlds w,public.dreamcatcher_jobs j
    where x.world_id=w.id and x.job_id=j.id and x.status not in ('settled','cancelled') and ((w.lifecycle_state<>'syncing' and not (x.round_number=1 and x.opened_at is null and w.lifecycle_state in ('proposed','picked'))) or j.status in ('withdrawn','completed'));
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
        -- Restore the old device entry's first scanning window without using it to publish.
        if r.round_number=1 then
          update public.worlds set scan_until=(select presentation_ready_at from public.dreamcatcher_rounds where id=r.id),scan_resolved_at=null where id=r.world_id;
        end if;
        update public.dreamcatchers set status='processing',updated_at=now() where id=room.id;
      else
        update public.dreamcatchers set status='idle',updated_at=now() where id=room.id;
      end if;
    end if;
  end loop;
end $$;

create or replace function public.dispatch_dreamcatcher_generation(p_request uuid,p_sessions jsonb) returns bigint
language plpgsql security invoker set search_path=public as $$
declare q public.dreamcatcher_generation_requests; r public.dreamcatcher_rounds; payload jsonb; cid bigint;
begin
  perform pg_advisory_xact_lock(770027);
  select * into q from public.dreamcatcher_generation_requests where id=p_request for update;
  select * into r from public.dreamcatcher_rounds where id=q.round_id;
  if q.id is null or q.status='cancelled' or r.status in ('settled','cancelled') or not exists(select 1 from public.worlds where id=r.world_id and (lifecycle_state='syncing' or (r.round_number=1 and lifecycle_state in ('proposed','picked')))) then return null; end if;
  if q.cosmo_request_id is not null then return q.cosmo_request_id; end if;
  if jsonb_typeof(p_sessions) is distinct from 'array' then raise exception 'Invalid session baseline'; end if;
  payload:='{}'::jsonb;
  if r.round_number>1 then
    select jsonb_build_object('puzzleType',feedback->>'puzzleType','tiles',feedback->'tiles') into payload
      from public.dreamcatcher_rounds where world_id=r.world_id and round_number=r.round_number-1 and status='settled';
    if payload is null then raise exception 'Previous round is not settled'; end if;
  end if;
  -- Caller has positively verified the existing Cosmo bootstrap before entering this RPC.
  -- Promote only here, never as a side effect of submitting or entering the device queue.
  update public.worlds set lifecycle_state='syncing' where id=r.world_id and lifecycle_state in ('proposed','picked');
  perform set_config('app.dreamcatcher_request','round',true);
  insert into public.cosmo_requests(world_id,type,payload) values(r.world_id,'expansion',payload) returning id into cid;
  update public.dreamcatcher_generation_requests set cosmo_request_id=cid,baseline_sessions=p_sessions,status='running',attempt=1,last_error=null where id=q.id;
  return cid;
end $$;

create or replace function public.retry_dreamcatcher_generation(p_request uuid) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
  perform pg_advisory_xact_lock(770027);
  update public.dreamcatcher_generation_requests q set status=case when cosmo_request_id is null then 'pending' else 'running' end,last_error=null,available_at=clock_timestamp()
    from public.dreamcatcher_rounds r, public.worlds w
    where q.id=p_request and q.round_id=r.id and r.world_id=w.id and (w.lifecycle_state='syncing' or (r.round_number=1 and r.opened_at is null and w.lifecycle_state in ('proposed','picked')))
      and q.status='failed' and r.status not in ('settled','cancelled');
  return found;
end $$;
commit;
