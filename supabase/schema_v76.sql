-- Initialize profiles after Auth has finished writing trusted app metadata.
-- GoTrue admin.createUser inserts auth.users before updating raw_app_meta_data.
-- No existing profiles or account kinds are changed by this migration.
-- Applied to production oxwfnmcwovxnrvagxzdz on 2026-09-23 as
-- defer_npc_profile_initialization; verified with a rolled-back creation/save.
begin;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  auth_user auth.users%rowtype;
begin
  -- NEW is the original INSERT snapshot, even for a deferred trigger.
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

drop trigger on_auth_user_created on auth.users;
create constraint trigger on_auth_user_created
after insert on auth.users
deferrable initially deferred
for each row execute function public.handle_new_user();

commit;
