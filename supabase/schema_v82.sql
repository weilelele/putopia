-- Allow every managed NPC identity to author comments, independent of device
-- allocation. The service-role + human-Architect audit boundary remains.
begin;

create or replace function public.validate_npc_comment()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.voyager_profiles where id = new.author_id and account_kind = 'npc') then
    if current_user <> 'service_role' or not exists (
      select 1 from public.voyager_profiles where id = new.posted_by_id and role = 'architect' and account_kind = 'human'
    ) then raise exception 'NPC comments require an administrator'; end if;
    if new.subject_type = 'dreamcatcher' then raise exception 'NPCs cannot post to Dreamcatcher chat'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_npc_comment() from public, anon, authenticated;

commit;
