-- Release submission eligibility after device processing, independently of results/votes.
begin;
drop index if exists public.dreamcatcher_jobs_one_unfinished_per_member;
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
commit;
