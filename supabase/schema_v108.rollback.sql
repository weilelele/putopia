-- Rollback for schema_v108 (anonymous checkout sessions).
-- Disable "Allow anonymous sign-ins" in Supabase Auth first. Existing anonymous
-- users and their shell profiles are left in place.
begin;

do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('drop policy if exists anonymous_no_insert on public.%I', t.relname);
    execute format('drop policy if exists anonymous_no_update on public.%I', t.relname);
    execute format('drop policy if exists anonymous_no_delete on public.%I', t.relname);
    execute format('drop policy if exists anonymous_no_member_read on public.%I', t.relname);
  end loop;
end;
$$;
drop policy if exists anonymous_no_insert on storage.objects;
drop policy if exists anonymous_no_update on storage.objects;
drop policy if exists anonymous_no_delete on storage.objects;

-- schema_v76 definition.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  auth_user auth.users%rowtype;
begin
  select * into auth_user from auth.users where id = new.id;
  if not found then return new; end if;

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

drop function if exists public.is_anonymous_session();

commit;
