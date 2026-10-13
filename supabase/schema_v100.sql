-- Feed NPC attribution. Apply after v97. Human creator retains sole edit/delete rights.
begin;
alter table public.voyager_feed_entries add column creator_id uuid references public.voyager_profiles(id) on delete cascade;
alter table public.voyager_feed_entries disable trigger guard_voyager_feed_entry;
update public.voyager_feed_entries set creator_id = author_id;
alter table public.voyager_feed_entries enable trigger guard_voyager_feed_entry;
alter table public.voyager_feed_entries alter column creator_id set not null;
alter table public.voyager_feed_entries alter column creator_id set default auth.uid();
-- v97's unnamed, cross-column attachment constraint.
alter table public.voyager_feed_entries drop constraint voyager_feed_entries_check;
alter table public.voyager_feed_entries add constraint feed_attachment_owner check (
 image_path is null or (parent_id is null and image_path like creator_id::text || '/%')
);
create index voyager_feed_creator on public.voyager_feed_entries(creator_id, created_at desc);
grant insert(creator_id) on public.voyager_feed_entries to authenticated;
drop policy feed_create on public.voyager_feed_entries;
create policy feed_create on public.voyager_feed_entries for insert to authenticated with check (
 (select public.voyager_feed_reader()) and creator_id = (select auth.uid())
 and (parent_id is not null or exists(select 1 from public.voyager_profiles where id=(select auth.uid()) and role in ('voyager','architect')))
 and (author_id = creator_id or (
   parent_id is null
   and exists(select 1 from public.voyager_profiles where id=(select auth.uid()) and role='architect' and account_kind='human')
   and exists(select 1 from public.voyager_profiles where id=author_id and account_kind='npc')
 ))
);
drop policy feed_edit on public.voyager_feed_entries;
create policy feed_edit on public.voyager_feed_entries for update to authenticated
 using ((select public.voyager_feed_reader()) and creator_id=(select auth.uid()))
 with check ((select public.voyager_feed_reader()) and creator_id=(select auth.uid()));
drop policy feed_delete on public.voyager_feed_entries;
create policy feed_delete on public.voyager_feed_entries for delete to authenticated
 using ((select public.voyager_feed_reader()) and creator_id=(select auth.uid()));
create or replace function public.guard_voyager_feed_entry() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id is distinct from old.id or new.creator_id is distinct from old.creator_id or new.author_id is distinct from old.author_id or new.parent_id is distinct from old.parent_id or new.image_path is distinct from old.image_path or new.created_at is distinct from old.created_at then
      raise exception 'Feed identity and attachment cannot be changed';
    end if;
    new.updated_at := clock_timestamp();
  else
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.creator_id::text, 97));
    if (select count(*) from public.voyager_feed_entries where creator_id = new.creator_id and created_at > now() - interval '1 minute') >= 20 then
      raise exception 'Please wait a minute before posting again';
    end if;
    if new.parent_id is not null and not exists(select 1 from public.voyager_feed_entries where id = new.parent_id and parent_id is null) then
      raise exception 'Reply target is unavailable';
    end if;
    new.created_at := clock_timestamp(); new.updated_at := new.created_at;
  end if;
  return new;
end;
$$;

-- Preserve existing view columns; do not expose creator attribution in the UI payload.
create or replace view public.voyager_feed_view with (security_invoker = true) as
select e.id,e.author_id,e.parent_id,e.body,e.image_path,e.created_at,e.updated_at,
 p.display_name,p.avatar_url,p.role as author_role,
 (select count(*) from public.voyager_feed_likes l where l.entry_id=e.id) as like_count,
 (select count(*) from public.voyager_feed_entries r where r.parent_id=e.id) as reply_count,
 exists(select 1 from public.voyager_feed_likes l where l.entry_id=e.id and l.user_id=(select auth.uid())) as liked,
 e.creator_id=(select auth.uid()) as can_manage
from public.voyager_feed_entries e join public.voyager_profiles p on p.id=e.author_id;
notify pgrst, 'reload schema';
commit;
