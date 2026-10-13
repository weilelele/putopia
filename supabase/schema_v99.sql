-- Voyager Feed. Apply before deploying the feed. No production fixtures.
begin;
create function public.voyager_feed_reader() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.voyager_profiles where id = (select auth.uid())
    and registered_at is not null and role in ('applicant','voyager','architect'));
$$;
revoke all on function public.voyager_feed_reader() from public, anon;
grant execute on function public.voyager_feed_reader() to authenticated;

create table public.voyager_feed_entries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.voyager_profiles(id) on delete cascade,
  parent_id uuid references public.voyager_feed_entries(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (image_path is null or (parent_id is null and image_path like author_id::text || '/%'))
);
create index voyager_feed_timeline on public.voyager_feed_entries(parent_id, created_at desc, id desc);
create index voyager_feed_author on public.voyager_feed_entries(author_id, created_at desc);
create table public.voyager_feed_likes (
  entry_id uuid not null references public.voyager_feed_entries(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.voyager_profiles(id) on delete cascade,
  primary key(entry_id, user_id)
);
alter table public.voyager_feed_entries enable row level security;
alter table public.voyager_feed_likes enable row level security;
revoke all on public.voyager_feed_entries, public.voyager_feed_likes from anon, authenticated;
grant select, delete on public.voyager_feed_entries to authenticated;
grant insert(id,author_id,parent_id,body,image_path), update(body) on public.voyager_feed_entries to authenticated;
grant select, insert, delete on public.voyager_feed_likes to authenticated;
create policy feed_read on public.voyager_feed_entries for select to authenticated using ((select public.voyager_feed_reader()));
create policy feed_create on public.voyager_feed_entries for insert to authenticated with check (
  (select public.voyager_feed_reader()) and author_id = (select auth.uid()) and
  (parent_id is not null or exists(select 1 from public.voyager_profiles where id = (select auth.uid()) and role in ('voyager','architect')))
);
create policy feed_edit on public.voyager_feed_entries for update to authenticated using (
  (select public.voyager_feed_reader()) and author_id = (select auth.uid())
) with check ((select public.voyager_feed_reader()) and author_id = (select auth.uid()));
create policy feed_delete on public.voyager_feed_entries for delete to authenticated using (
  (select public.voyager_feed_reader()) and author_id = (select auth.uid())
);
create policy feed_like_read on public.voyager_feed_likes for select to authenticated using ((select public.voyager_feed_reader()));
create policy feed_like_create on public.voyager_feed_likes for insert to authenticated with check (
  (select public.voyager_feed_reader()) and user_id = (select auth.uid())
);
create policy feed_like_delete on public.voyager_feed_likes for delete to authenticated using (
  (select public.voyager_feed_reader()) and user_id = (select auth.uid())
);

create function public.guard_voyager_feed_entry() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id is distinct from old.id or new.author_id is distinct from old.author_id or new.parent_id is distinct from old.parent_id or new.image_path is distinct from old.image_path or new.created_at is distinct from old.created_at then
      raise exception 'Feed identity and attachment cannot be changed';
    end if;
    new.updated_at := clock_timestamp();
  else
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text, 97));
    if (select count(*) from public.voyager_feed_entries where author_id = new.author_id and created_at > now() - interval '1 minute') >= 20 then
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
revoke all on function public.guard_voyager_feed_entry() from public, anon, authenticated;
create trigger guard_voyager_feed_entry before insert or update on public.voyager_feed_entries for each row execute function public.guard_voyager_feed_entry();

create view public.voyager_feed_view with (security_invoker = true) as
select e.*, p.display_name, p.avatar_url, p.role as author_role,
 (select count(*) from public.voyager_feed_likes l where l.entry_id=e.id) as like_count,
 (select count(*) from public.voyager_feed_entries r where r.parent_id=e.id) as reply_count,
 exists(select 1 from public.voyager_feed_likes l where l.entry_id=e.id and l.user_id=(select auth.uid())) as liked
from public.voyager_feed_entries e join public.voyager_profiles p on p.id=e.author_id;
revoke all on public.voyager_feed_view from anon;
grant select on public.voyager_feed_view to authenticated;

-- Private media: registered readers only, never public or signed public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('voyager-feed','voyager-feed',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy feed_media_insert on storage.objects for insert to authenticated with check (
 bucket_id='voyager-feed' and (storage.foldername(name))[1]=(select auth.uid())::text
 and (select public.voyager_feed_reader()) and exists(select 1 from public.voyager_profiles where id=(select auth.uid()) and role in ('voyager','architect'))
);
create policy feed_media_read on storage.objects for select to authenticated using (
 bucket_id='voyager-feed' and (select public.voyager_feed_reader())
 and exists(select 1 from public.voyager_feed_entries where image_path=name)
);
-- Author-confirmed deletion cleans media server-side; failed-upload orphans need an operator sweep.
-- Clients cannot delete a live attachment directly.
notify pgrst, 'reload schema';
commit;
