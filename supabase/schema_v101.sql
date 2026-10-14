-- Mutually exclusive up/down votes; existing likes become upvotes.
begin;
alter table public.voyager_feed_likes add column direction smallint not null default 1 check (direction in (-1,1));
grant update(entry_id,user_id,direction) on public.voyager_feed_likes to authenticated;
create policy feed_vote_update on public.voyager_feed_likes for update to authenticated
 using ((select public.voyager_feed_reader()) and user_id=(select auth.uid()))
 with check ((select public.voyager_feed_reader()) and user_id=(select auth.uid()));
create function public.guard_voyager_feed_vote() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.entry_id is distinct from old.entry_id or new.user_id is distinct from old.user_id then
   raise exception 'Vote identity cannot be changed';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_voyager_feed_vote() from public, anon, authenticated;
create trigger guard_voyager_feed_vote before update on public.voyager_feed_likes for each row execute function public.guard_voyager_feed_vote();
create or replace view public.voyager_feed_view with (security_invoker = true) as
select e.id,e.author_id,e.parent_id,e.body,e.image_path,e.created_at,e.updated_at,
 p.display_name,p.avatar_url,p.role as author_role,
 (select count(*) from public.voyager_feed_likes l where l.entry_id=e.id and l.direction=1) as like_count,
 (select count(*) from public.voyager_feed_entries r where r.parent_id=e.id) as reply_count,
 exists(select 1 from public.voyager_feed_likes l where l.entry_id=e.id and l.user_id=(select auth.uid()) and l.direction=1) as liked,
 e.creator_id=(select auth.uid()) as can_manage,
 (select count(*) from public.voyager_feed_likes l where l.entry_id=e.id and l.direction=-1) as down_count,
 exists(select 1 from public.voyager_feed_likes l where l.entry_id=e.id and l.user_id=(select auth.uid()) and l.direction=-1) as downvoted
from public.voyager_feed_entries e join public.voyager_profiles p on p.id=e.author_id;
notify pgrst, 'reload schema';
commit;
