-- Voyager Path v2: Pack + private five-question profile; optional London observation.
-- Requires v80. No backfill or downgrade of existing members. Not applied to production.
begin;
create table public.voyager_intake (
  user_id uuid primary key references public.voyager_profiles(id) on delete cascade,
  version text not null default 'voyager-profile-v1',
  answers jsonb not null,
  observation_world_id text references public.worlds(id) on delete set null,
  completed_at timestamptz not null default now()
);
alter table public.voyager_intake enable row level security;
revoke all on public.voyager_intake from public, anon, authenticated;
grant all on public.voyager_intake to service_role;

-- Profile-origin observations have their own one-per-profile idempotency rule.
-- v80 device admission checks remain unchanged; no legacy limit is recreated.
alter table public.dreamcatcher_jobs add column submission_source text not null default 'device'
  check (submission_source in ('device','voyager_profile'));
create unique index dreamcatcher_jobs_one_profile_per_member
  on public.dreamcatcher_jobs(submitted_by) where submission_source='voyager_profile';

create function public.activate_voyager_path(p_user uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare person public.voyager_profiles;
begin
  perform pg_advisory_xact_lock(hashtextextended('voyager-path:' || p_user::text,0));
  select * into person from public.voyager_profiles where id=p_user for update;
  if person.id is null then raise exception 'Profile not found'; end if;
  if person.role in ('voyager','architect') then return false; end if;
  if not exists(select 1 from public.voyager_intake where user_id=p_user and version='voyager-profile-v1')
    or not exists(select 1 from public.voyager_orders where user_id=p_user
      and coalesce(product_type,'voyager_pack')='voyager_pack'
      and status in ('paid','preparing','shipped','delivered')) then return false; end if;
  perform public.provision_voyager(p_user);
  return true;
end $$;

create function public.save_voyager_intake(p_user uuid,p_answers jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare person public.voyager_profiles; room public.dreamcatchers; existing public.voyager_intake;
  wid text; tid uuid; jid uuid; rid uuid; title text; activated boolean;
begin
  -- Same lock order as the device round engine, then the per-member path lock.
  perform pg_advisory_xact_lock(770027);
  perform pg_advisory_xact_lock(hashtextextended('voyager-path:' || p_user::text,0));
  select * into person from public.voyager_profiles where id=p_user;
  if person.id is null or person.role not in ('applicant','voyager','architect') then raise exception 'Applicant access required'; end if;
  select * into existing from public.voyager_intake where user_id=p_user;
  if existing.user_id is not null then
    activated := public.activate_voyager_path(p_user);
    return jsonb_build_object('worldId',existing.observation_world_id,'activated',activated);
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object'
    or coalesce(p_answers->>'mission','') not in ('a','b','c','d')
    or coalesce(p_answers->>'console','') not in ('a','b','c','d')
    or coalesce(p_answers->>'country','') not in ('United States','Japan','Other')
    or length(trim(coalesce(p_answers->>'region',''))) not between 1 and 100
    or length(trim(coalesce(p_answers->>'work',''))) not between 1 and 300
    or length(trim(coalesce(p_answers->>'observation',''))) not between 1 and 2000
    or jsonb_typeof(p_answers->'shareObservation') is distinct from 'boolean'
    or (p_answers->>'country'='Other' and length(trim(coalesce(p_answers->>'otherCountry',''))) not between 1 and 100)
    then raise exception 'Complete all five profile questions'; end if;

  if (p_answers->>'shareObservation')::boolean then
    select * into room from public.dreamcatchers where slug='london-01' and is_public for update;
    if room.id is null then raise exception 'The Parallax Array is unavailable. Please try again later or save without sharing.'; end if;
    -- A new profile observation is accepted independently of existing device
    -- observations and waits in the normal round queue, even while the array pauses.
    title := left(trim(p_answers->>'observation'),80);
    -- Use the shared World intake so bootstrap and lifecycle behavior match
    -- observations entered through Worlds. Do not skip an existing observation.
    wid := public.create_observation_world(p_user,title,title,trim(p_answers->>'observation'),
      coalesce(nullif(trim(person.display_name),''),'Voyager'),'#080C20','#080C20',null,room.id);
    insert into public.signal_threads(world_id,type,created_by,orchestration)
      values(wid,'visual_match',p_user,'dreamcatcher_rounds') returning id into tid;
    insert into public.dreamcatcher_jobs(dreamcatcher_id,world_id,submitted_by,status,round_number,round_duration_minutes,signal_thread_id,orchestration,submission_source)
      values(room.id,wid,p_user,'awaiting_dispatch',1,room.round_duration_minutes,tid,'dreamcatcher_rounds','voyager_profile') returning id into jid;
    insert into public.dreamcatcher_rounds(job_id,world_id,dreamcatcher_id,initiator_id,round_number)
      values(jid,wid,room.id,p_user,1) returning id into rid;
    perform public.dreamcatcher_enqueue_generation(rid);
  end if;
  insert into public.voyager_intake(user_id,answers,observation_world_id) values(p_user,p_answers,wid);
  activated := public.activate_voyager_path(p_user);
  return jsonb_build_object('worldId',wid,'activated',activated);
end $$;
revoke all on function public.activate_voyager_path(uuid), public.save_voyager_intake(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.activate_voyager_path(uuid), public.save_voyager_intake(uuid,jsonb) to service_role;
-- The ungated grant helper is trusted-server-only (device claims/admin grants).
revoke all on function public.provision_voyager(uuid) from public,anon,authenticated;
grant execute on function public.provision_voyager(uuid) to service_role;
commit;
