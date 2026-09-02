-- Production workspace for the parallel-world creation workflow.
-- Workflow details remain JSON so the internal process can evolve without
-- destructive table rewrites; uploaded files keep normalized ownership data.

create table if not exists public.worldflow_worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  owner_id uuid not null references public.voyager_profiles(id) on delete cascade,
  owner_name text not null default '',
  current_step integer not null default 1 check (current_step between 1 and 7),
  current_status text not null default 'draft'
    check (current_status in ('draft', 'review', 'changes', 'approved', 'optional', 'skipped')),
  workflow_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worldflow_assets (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worldflow_worlds(id) on delete cascade,
  uploaded_by uuid not null references public.voyager_profiles(id) on delete cascade,
  step integer not null check (step between 1 and 7),
  shot_id text,
  event_id text,
  media_type text not null check (media_type in ('image', 'video')),
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  file_size bigint not null check (file_size > 0),
  mime_type text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create index if not exists worldflow_worlds_owner_updated_idx
  on public.worldflow_worlds (owner_id, updated_at desc);
create index if not exists worldflow_assets_world_step_idx
  on public.worldflow_assets (world_id, step, shot_id, event_id, created_at desc);

alter table public.worldflow_worlds enable row level security;
alter table public.worldflow_assets enable row level security;

-- Data access goes through authenticated server actions/routes that verify the
-- caller and ownership. Keep the Data API surface unavailable to clients.
revoke all on table public.worldflow_worlds from anon, authenticated;
revoke all on table public.worldflow_assets from anon, authenticated;
grant all on table public.worldflow_worlds to service_role;
grant all on table public.worldflow_assets to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worldflow-assets',
  'worldflow-assets',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are written and read through authenticated server routes. The bucket
-- stays private so internal images and videos cannot be opened anonymously.
