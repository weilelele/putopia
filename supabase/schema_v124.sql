-- Parallax Array participation and Mission Board acceptance. Apply after v121.
begin;

create function membership_private.require_parallax_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  if tg_table_name = 'dreamcatcher_jobs' then
    actor := new.submitted_by;
  elsif exists (select 1 from public.dreamcatcher_rounds where task_id = new.task_id) then
    actor := new.user_id;
  else
    return new;
  end if;

  if coalesce(membership_private.access_role_for(actor), 'guest') not in ('voyager', 'architect') then
    raise exception using errcode = '42501', message = 'Voyager membership is required to use the Parallax Array.';
  end if;
  return new;
end $$;

revoke all on function membership_private.require_parallax_member() from public, anon, authenticated;

-- Job creation is part of the same transaction as the world and generation request.
-- This covers both Worlds Live and the optional profile calibration submission.
create trigger dreamcatcher_job_member_required before insert on public.dreamcatcher_jobs
for each row execute function membership_private.require_parallax_member();

create trigger dreamcatcher_response_member_required before insert on public.signal_responses
for each row execute function membership_private.require_parallax_member();

create function membership_private.require_mission_console() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(membership_private.access_role_for(new.user_id), 'guest') not in ('voyager', 'architect')
    or not public.has_bound_console(new.user_id) then
    raise exception using errcode = '42501', message = 'Voyager membership and a bound Multiverse Console are required to accept a mission.';
  end if;
  return new;
end $$;

revoke all on function membership_private.require_mission_console() from public, anon, authenticated;

create trigger mission_acceptance_console_required before insert on public.mission_acceptances
for each row execute function membership_private.require_mission_console();

commit;
