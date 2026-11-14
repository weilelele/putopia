-- Roll back v113: applicants may submit and, on 'all' worlds, vote again.
-- Restores the v79, v80 and v77 definitions exactly. Observations and votes recorded meanwhile are kept.
begin;

create or replace function public.create_observation_world(
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
  -- Admission is serialized by the existing advisory lock. Returning rounds are
  -- never rejected by a per-member unique index when another world is queued.
  if exists(select 1 from public.dreamcatcher_jobs j join public.dreamcatcher_rounds r on r.job_id=j.id
    where j.dreamcatcher_id=room.id and j.submitted_by=p_user and r.status in ('waiting_capacity','queued','processing')) then
    raise exception 'You already have an observation waiting for or using this device. You can submit another when device processing finishes.';
  end if;
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

create or replace function public.respond_dreamcatcher_round(p_task uuid,p_asset uuid,p_user uuid) returns jsonb
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

drop function public.can_submit_observation(uuid);

commit;
