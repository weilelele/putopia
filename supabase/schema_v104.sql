-- Anonymous checkout sessions (Supabase anonymous sign-ins).
-- NOT APPLIED. Apply before enabling "Allow anonymous sign-ins" in Supabase Auth.
--
-- A guest who taps Pay on /voyager-initiation gets an anonymous Auth user so
-- calibration and the seat reservation have a real user id. Anonymous JWTs use
-- the `authenticated` Postgres role, so every "any logged-in user" rule would
-- otherwise open up to them. This migration:
--   1. lets handle_new_user create a shell profile for an anonymous user
--      (email is null, so the old display_name fallback violated NOT NULL);
--   2. blocks every PostgREST write by an anonymous session (the purchase path
--      writes only through the service role);
--   3. hides the logged-in-only reads (members' comments, activity, signal
--      tasks, world pipeline) from anonymous sessions, matching logged-out
--      visitors. These tables have no policy for the `anon` role, so a
--      restrictive "not anonymous" select rule is exactly logged-out access.
-- Audit query: supabase/audit_anonymous_access.sql. Rollback: schema_v104.rollback.sql.
begin;

create or replace function public.is_anonymous_session() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$$;
revoke all on function public.is_anonymous_session() from public;
grant execute on function public.is_anonymous_session() to anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  auth_user auth.users%rowtype;
begin
  -- NEW is the original INSERT snapshot, even for a deferred trigger.
  select * into auth_user from auth.users where id = new.id;
  if not found then return new; end if;

  -- Anonymous checkout users: unregistered shell profile, no email yet.
  -- /register fills email, display name and registered_at after the email is confirmed.
  if auth_user.is_anonymous then
    insert into public.voyager_profiles (id, display_name, role, email, experiment_group, account_kind)
    values (auth_user.id, 'Voyager', 'applicant'::public.user_role, null,
      case when random() < 0.5 then 'direct' else 'task_gated' end, 'human');
    return new;
  end if;

  insert into public.voyager_profiles (id, display_name, role, email, experiment_group, account_kind)
  values (
    auth_user.id,
    coalesce(auth_user.raw_user_meta_data->>'display_name', split_part(auth_user.email, '@', 1)),
    case when auth_user.raw_app_meta_data->>'account_kind' = 'npc' then 'guest'::public.user_role else 'applicant'::public.user_role end,
    case when auth_user.raw_app_meta_data->>'account_kind' = 'npc' then null else lower(auth_user.email) end,
    case when auth_user.raw_app_meta_data->>'account_kind' = 'npc' then null when random() < 0.5 then 'direct' else 'task_gated' end,
    case when auth_user.raw_app_meta_data->>'account_kind' = 'npc' then 'npc' else 'human' end
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Restrictive rules AND with every permissive rule on these tables, including
-- permissive rules added later. Tables created later need their own guard.
do $$
declare t record; member_table text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists anonymous_no_insert on public.%I', t.relname);
    execute format('drop policy if exists anonymous_no_update on public.%I', t.relname);
    execute format('drop policy if exists anonymous_no_delete on public.%I', t.relname);
    execute format('create policy anonymous_no_insert on public.%I as restrictive for insert to authenticated with check (not (select public.is_anonymous_session()))', t.relname);
    execute format('create policy anonymous_no_update on public.%I as restrictive for update to authenticated using (not (select public.is_anonymous_session()))', t.relname);
    execute format('create policy anonymous_no_delete on public.%I as restrictive for delete to authenticated using (not (select public.is_anonymous_session()))', t.relname);
  end loop;

  foreach member_table in array array['activity_events', 'comments', 'world_images', 'worlds', 'signal_tasks', 'signal_task_assets'] loop
    if to_regclass('public.' || member_table) is not null then
      execute format('drop policy if exists anonymous_no_member_read on public.%I', member_table);
      execute format('create policy anonymous_no_member_read on public.%I as restrictive for select to authenticated using (not (select public.is_anonymous_session()))', member_table);
    end if;
  end loop;
end;
$$;

drop policy if exists anonymous_no_insert on storage.objects;
drop policy if exists anonymous_no_update on storage.objects;
drop policy if exists anonymous_no_delete on storage.objects;
create policy anonymous_no_insert on storage.objects as restrictive for insert to authenticated with check (not (select public.is_anonymous_session()));
create policy anonymous_no_update on storage.objects as restrictive for update to authenticated using (not (select public.is_anonymous_session()));
create policy anonymous_no_delete on storage.objects as restrictive for delete to authenticated using (not (select public.is_anonymous_session()));

commit;
