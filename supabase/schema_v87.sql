-- schema_v87: content reports + user blocks (App Store Guideline 1.2)
-- Members can report any discussion comment/chat message and block other
-- members. Blocks hide the blocked member's content from the blocker only.
-- Not yet applied to production — apply before deploying the code that uses it.

create table if not exists public.content_reports (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  reporter_id  uuid        not null references public.voyager_profiles(id) on delete cascade,
  -- exactly one target: a discussion comment / chat message, or a member's world report
  comment_id       uuid references public.comments(id) on delete cascade,
  world_report_id  uuid references public.world_reports(id) on delete cascade,
  reason       text        not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details      text        check (details is null or char_length(details) <= 500),
  status       text        not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  resolved_by  uuid        references public.voyager_profiles(id) on delete set null,
  resolved_at  timestamptz,
  check (num_nonnulls(comment_id, world_report_id) = 1),
  unique (reporter_id, comment_id),
  unique (reporter_id, world_report_id)
);

create index if not exists content_reports_open_idx
  on public.content_reports (created_at) where status = 'open';

create table if not exists public.user_blocks (
  blocker_id  uuid        not null references public.voyager_profiles(id) on delete cascade,
  blocked_id  uuid        not null references public.voyager_profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Server actions use the service role; members never read these tables directly.
alter table public.content_reports enable row level security;
alter table public.user_blocks     enable row level security;

create policy "service role full access on content_reports"
  on public.content_reports for all to service_role using (true) with check (true);
create policy "service role full access on user_blocks"
  on public.user_blocks for all to service_role using (true) with check (true);

-- New tables get no default privileges here; the server actions use service_role.
grant select, insert, update, delete on public.content_reports to service_role;
grant select, insert, update, delete on public.user_blocks     to service_role;
