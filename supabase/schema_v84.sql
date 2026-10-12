-- Worlds reporting: observation and anomaly reports.
--
-- "Seen" for a world = distinct authors of its observation reports; anomalies =
-- count of its anomaly reports. A world with no observation yet is a fuzzy
-- signal; the first observer becomes its "by" (official worlds).
--
-- Reads are public. Writes are service-role only: the server action checks the
-- author's "has device" status (delivered device or device_access_grants row),
-- so nothing here trusts the client. Architects may file as an NPC; that is
-- recorded in posted_by_id for audit, mirroring comments.
begin;

create table if not exists public.world_reports (
  id           uuid primary key default gen_random_uuid(),
  world_id     text not null references public.worlds(id) on delete cascade,
  kind         text not null check (kind in ('observation', 'anomaly')),
  author_id    uuid not null references public.voyager_profiles(id) on delete cascade,
  posted_by_id uuid references public.voyager_profiles(id) on delete set null,
  body         text not null check (char_length(btrim(body)) between 10 and 1000),
  image_urls   text[] not null default '{}' check (cardinality(image_urls) <= 3),
  is_visible   boolean not null default true,
  source       text not null default 'user' check (source in ('user', 'seed')),
  created_at   timestamptz not null default now()
);

create index if not exists world_reports_world_kind_idx on public.world_reports (world_id, kind, created_at desc);
create index if not exists world_reports_author_idx on public.world_reports (author_id);

alter table public.world_reports enable row level security;

drop policy if exists "world_reports_select_visible" on public.world_reports;
create policy "world_reports_select_visible"
  on public.world_reports for select
  using (is_visible);

revoke all on public.world_reports from anon, authenticated;
grant select on public.world_reports to anon, authenticated;
grant select, insert, update, delete on public.world_reports to service_role;

-- An NPC may only author a report through the service role, posted by a human architect.
create or replace function public.validate_world_report()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.voyager_profiles where id = new.author_id and account_kind = 'npc') then
    if current_user <> 'service_role' or not exists (
      select 1 from public.voyager_profiles where id = new.posted_by_id and role = 'architect' and account_kind = 'human'
    ) then raise exception 'NPC reports require an administrator'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_world_report() from public, anon, authenticated;

drop trigger if exists world_reports_validate on public.world_reports;
create trigger world_reports_validate before insert on public.world_reports
for each row execute function public.validate_world_report();

commit;
