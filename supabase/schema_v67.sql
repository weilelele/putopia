-- schema_v67.sql -- Dreamcatcher rooms and deterministic round queue.
-- Additive only. This migration intentionally keeps the existing worlds and
-- Signal Dispatch tables as the canonical content/voting records.

create table if not exists public.dreamcatchers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text not null unique,
  name text not null,
  city text not null,
  country text not null,
  location text not null,
  time_zone text not null,
  status text not null default 'idle'
    check (status in ('processing', 'paused', 'idle', 'offline', 'awaiting_signal')),
  round_duration_minutes integer not null default 8
    check (round_duration_minutes between 8 and 10),
  queue_capacity integer not null default 50
    check (queue_capacity between 1 and 500),
  camera_image_path text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dreamcatcher_jobs (
  id uuid primary key default gen_random_uuid(),
  dreamcatcher_id uuid not null references public.dreamcatchers(id) on delete restrict,
  world_id text not null references public.worlds(id) on delete cascade,
  submitted_by uuid not null references public.voyager_profiles(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'awaiting_dispatch', 'awaiting_vote', 'returning', 'completed', 'withdrawn', 'failed')),
  round_number integer not null default 1 check (round_number > 0),
  round_duration_minutes integer not null check (round_duration_minutes between 8 and 10),
  queued_at timestamptz not null default now(),
  processing_started_at timestamptz,
  estimated_ready_at timestamptz,
  signal_thread_id uuid references public.signal_threads(id) on delete set null,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists dreamcatcher_jobs_one_unfinished_per_member
  on public.dreamcatcher_jobs (dreamcatcher_id, submitted_by)
  where status in ('queued', 'processing', 'awaiting_dispatch', 'awaiting_vote', 'returning');

create unique index if not exists dreamcatcher_jobs_one_processing_per_device
  on public.dreamcatcher_jobs (dreamcatcher_id)
  where status = 'processing';

create index if not exists dreamcatcher_jobs_room_queue_idx
  on public.dreamcatcher_jobs (dreamcatcher_id, status, queued_at);

alter table public.dreamcatchers enable row level security;
alter table public.dreamcatcher_jobs enable row level security;

drop policy if exists "dreamcatchers_public_read" on public.dreamcatchers;
create policy "dreamcatchers_public_read"
  on public.dreamcatchers for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "dreamcatcher_jobs_public_read" on public.dreamcatcher_jobs;
drop policy if exists "dreamcatcher_jobs_owner_read" on public.dreamcatcher_jobs;
create policy "dreamcatcher_jobs_owner_read"
  on public.dreamcatcher_jobs for select
  to authenticated
  using ((select auth.uid()) = submitted_by);

revoke all on table public.dreamcatchers from anon, authenticated;
revoke all on table public.dreamcatcher_jobs from anon, authenticated;
grant select on table public.dreamcatchers to anon, authenticated;
grant select on table public.dreamcatcher_jobs to authenticated;
grant all on table public.dreamcatchers to service_role;
grant all on table public.dreamcatcher_jobs to service_role;

create or replace function public.enforce_dreamcatcher_queue_capacity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  capacity integer;
  occupied integer;
begin
  if new.status <> 'queued' then return new; end if;
  select queue_capacity into capacity
  from public.dreamcatchers where id = new.dreamcatcher_id for update;

  select count(*) into occupied
  from public.dreamcatcher_jobs
  where dreamcatcher_id = new.dreamcatcher_id
    and status in ('queued', 'returning');

  if occupied >= capacity then
    raise exception 'Dreamcatcher queue is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists dreamcatcher_queue_capacity on public.dreamcatcher_jobs;
create trigger dreamcatcher_queue_capacity
  before insert or update of status, dreamcatcher_id on public.dreamcatcher_jobs
  for each row execute function public.enforce_dreamcatcher_queue_capacity();

revoke execute on function public.enforce_dreamcatcher_queue_capacity() from public, anon, authenticated;
grant execute on function public.enforce_dreamcatcher_queue_capacity() to service_role;

-- Called by the server cron. A room has one deterministic active round. When a
-- round ends it waits for Signal Dispatch; the next queued dream can then begin.
create or replace function public.advance_dreamcatcher_jobs(p_now timestamptz default now())
returns table(started integer, finished integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  room record;
  next_job record;
  started_count integer := 0;
  finished_count integer := 0;
begin
  -- A published Signal Dispatch day opens community voting for the matching
  -- round. Once its existing 24-hour voting window closes, the same job returns
  -- to its original Dreamcatcher and is prioritised for the next round.
  update public.dreamcatcher_jobs j
  set status = 'awaiting_vote', updated_at = p_now
  where j.status = 'awaiting_dispatch'
    and j.signal_thread_id is not null
    and exists (
      select 1 from public.signal_tasks t
      where t.thread_id = j.signal_thread_id
        and t.is_published = true
        and coalesce(t.day_index, 0) + 1 >= j.round_number
    );

  update public.dreamcatcher_jobs j
  set status = 'returning',
      round_number = j.round_number + 1,
      queued_at = p_now,
      processing_started_at = null,
      estimated_ready_at = null,
      updated_at = p_now
  where j.status = 'awaiting_vote'
    and j.signal_thread_id is not null
    and exists (
      select 1 from public.signal_tasks t
      where t.thread_id = j.signal_thread_id
        and t.is_published = true
        and coalesce(t.day_index, 0) + 1 >= j.round_number
        and t.published_at + interval '24 hours' <= p_now
    );

  update public.dreamcatcher_jobs
  set status = 'awaiting_dispatch', updated_at = p_now
  where status = 'processing' and estimated_ready_at <= p_now;
  get diagnostics finished_count = row_count;

  for room in select * from public.dreamcatchers where is_public and status <> 'offline' for update loop
    if not exists (
      select 1 from public.dreamcatcher_jobs
      where dreamcatcher_id = room.id and status = 'processing'
    ) then
      select * into next_job
      from public.dreamcatcher_jobs
      where dreamcatcher_id = room.id and status in ('returning', 'queued')
      order by case when status = 'returning' then 0 else 1 end, queued_at
      for update skip locked
      limit 1;

      if found then
        update public.dreamcatcher_jobs
        set status = 'processing',
            processing_started_at = p_now,
            estimated_ready_at = p_now + make_interval(mins => room.round_duration_minutes),
            updated_at = p_now
        where id = next_job.id;
        update public.worlds
        set scan_until = p_now + make_interval(mins => room.round_duration_minutes),
            scan_resolved_at = null
        where id = next_job.world_id;
        update public.dreamcatchers set status = 'processing', updated_at = p_now where id = room.id;
        started_count := started_count + 1;
      else
        update public.dreamcatchers set status = 'idle', updated_at = p_now
        where id = room.id and status <> 'paused';
      end if;
    end if;
  end loop;
  return query select started_count, finished_count;
end;
$$;

revoke all on function public.advance_dreamcatcher_jobs(timestamptz) from public, anon, authenticated;
grant execute on function public.advance_dreamcatcher_jobs(timestamptz) to service_role;

insert into public.dreamcatchers
  (slug, code, name, city, country, location, time_zone, status, round_duration_minutes, queue_capacity, camera_image_path)
values
  ('kyoto-02', 'DC-KYO-02', 'Kyoto Dreamcatcher', 'Kyoto', 'Japan', 'Kyoto, Japan', 'Asia/Tokyo', 'idle', 8, 50, '/assets/concepts/dreamcatcher-live-feed.png'),
  ('tokyo-01', 'DC-TYO-01', 'Tokyo Dreamcatcher', 'Tokyo', 'Japan', 'Tokyo, Japan', 'Asia/Tokyo', 'idle', 9, 50, '/assets/concepts/dreamcatcher-live-feed.png'),
  ('london-01', 'DC-LON-01', 'London Dreamcatcher', 'London', 'United Kingdom', 'London, United Kingdom', 'Europe/London', 'paused', 10, 50, '/assets/concepts/dreamcatcher-live-feed.png'),
  ('mexico-city-03', 'DC-MEX-03', 'Mexico City Dreamcatcher', 'Mexico City', 'Mexico', 'Mexico City, Mexico', 'America/Mexico_City', 'idle', 8, 50, '/assets/concepts/dreamcatcher-live-feed.png')
on conflict (slug) do nothing;
