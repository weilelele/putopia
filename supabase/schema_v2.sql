-- Putopia Collective — Schema v2
-- Run AFTER schema.sql in the Supabase SQL Editor

-- ─────────────────────────────────────────
-- New enum
-- ─────────────────────────────────────────

create type public.intel_tag as enum ('NOTICE', 'DEVICE', 'ORG');

-- ─────────────────────────────────────────
-- devices
-- ─────────────────────────────────────────

create table public.devices (
  id                    text primary key,
  name                  text not null,
  batch_id              text,
  knowledge             public.device_knowledge not null,
  location              text not null,
  description           text not null,
  image_path            text,
  -- known-device fields
  status                public.device_status,
  current_user_id       uuid references public.voyager_profiles(id) on delete set null,
  current_user_name     text,            -- denormalized for display without join
  -- unknown-device fields
  exploration_progress  integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.devices enable row level security;

-- Voyager+ can read all devices
create policy "devices_select_voyager"
  on public.devices for select
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('voyager', 'architect')
    )
  );

-- Architects can manage all devices
create policy "devices_all_architect"
  on public.devices for all
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

create trigger devices_updated_at
  before update on public.devices
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────
-- worlds
-- ─────────────────────────────────────────

create table public.worlds (
  id               text primary key,
  name             text not null,
  name_en          text not null,
  discoverer_id    uuid references public.voyager_profiles(id) on delete set null,
  discoverer_name  text not null,        -- denormalized
  discovery_date   date not null,
  gradient_from    text not null,
  gradient_to      text not null,
  description      text not null,
  is_verified      boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.worlds enable row level security;

-- Voyager+ can read all worlds
create policy "worlds_select_voyager"
  on public.worlds for select
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('voyager', 'architect')
    )
  );

-- Architects can manage all worlds
create policy "worlds_all_architect"
  on public.worlds for all
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- ─────────────────────────────────────────
-- intel
-- ─────────────────────────────────────────

create table public.intel (
  id          text primary key,
  title       text not null,
  content     text not null,
  timestamp   timestamptz not null default now(),
  tag         public.intel_tag not null,
  classified  boolean not null default false,
  created_by  uuid references public.voyager_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.intel enable row level security;

-- Unclassified intel is readable by anyone (including guests)
create policy "intel_select_public"
  on public.intel for select
  using (classified = false);

-- Classified intel: voyager+ only
create policy "intel_select_voyager"
  on public.intel for select
  using (
    classified = true
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('voyager', 'architect')
    )
  );

-- Architects can manage all intel
create policy "intel_all_architect"
  on public.intel for all
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- ─────────────────────────────────────────
-- stories
-- ─────────────────────────────────────────

create table public.stories (
  id           text primary key,          -- URL-safe slug
  title        text not null,
  author_id    uuid references public.voyager_profiles(id) on delete set null,
  author_name  text not null,             -- denormalized
  date         date not null,
  tags         text[] not null default '{}',
  excerpt      text not null,
  content      text not null,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.stories enable row level security;

-- Voyager+ can read published stories
create policy "stories_select_published"
  on public.stories for select
  using (
    is_published = true
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('voyager', 'architect')
    )
  );

-- Authors can read their own stories (any status)
create policy "stories_select_own"
  on public.stories for select
  using (author_id = auth.uid());

-- Voyager+ can submit stories (always unpublished initially)
create policy "stories_insert_voyager"
  on public.stories for insert
  with check (
    author_id = auth.uid()
    and is_published = false
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('voyager', 'architect')
    )
  );

-- Authors can update their own unpublished stories
create policy "stories_update_own"
  on public.stories for update
  using (author_id = auth.uid() and is_published = false)
  with check (author_id = auth.uid() and is_published = false);

-- Architects can manage all stories (including publish/unpublish)
create policy "stories_all_architect"
  on public.stories for all
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

create trigger stories_updated_at
  before update on public.stories
  for each row execute procedure public.set_updated_at();
