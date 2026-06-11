-- ─────────────────────────────────────────
-- schema_v29: world lifecycle + world_images
-- Adds user-submission flow to the worlds table:
--   • lifecycle_state enum: proposed → picked → syncing → stable
--   • submitted_by / submitted_at for user proposals
--   • world_images table (Supabase Storage + external URL)
--   • RLS: authenticated users can insert 'proposed' worlds
--   • RLS: authenticated users can see proposed/picked worlds
-- ─────────────────────────────────────────

-- Lifecycle enum
do $$ begin
  create type public.world_lifecycle as enum ('proposed', 'picked', 'syncing', 'stable');
exception when duplicate_object then null;
end $$;

-- Add lifecycle columns to existing worlds table
alter table public.worlds
  add column if not exists lifecycle_state public.world_lifecycle not null default 'stable',
  add column if not exists submitted_by    uuid references public.voyager_profiles(id) on delete set null,
  add column if not exists submitted_at    timestamptz;

-- World images
create table if not exists public.world_images (
  id           uuid primary key default gen_random_uuid(),
  world_id     text not null references public.worlds(id) on delete cascade,
  url          text not null,          -- public URL (Storage or external)
  storage_path text,                   -- Storage object path; null for external links
  caption      text,
  source       text,                   -- 'upload' | 'repost'
  uploaded_by  uuid references public.voyager_profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists world_images_world_idx on public.world_images (world_id);

alter table public.world_images enable row level security;

-- Any authenticated user can read world images
create policy "world_images_select_auth" on public.world_images
  for select using (auth.uid() is not null);

-- Architects can manage world images
create policy "world_images_all_architect" on public.world_images
  for all using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

grant all   on table public.world_images to service_role;
grant select on table public.world_images to authenticated;

-- ─────────────────────────────────────────
-- New RLS policies on worlds
-- ─────────────────────────────────────────

-- Any authenticated user (applicant+) can insert a 'proposed' world
create policy "worlds_insert_proposed" on public.worlds
  for insert with check (
    lifecycle_state = 'proposed'
    and auth.uid() is not null
  );

-- Any authenticated user can read proposed/picked worlds (community pipeline)
create policy "worlds_select_pipeline" on public.worlds
  for select using (
    lifecycle_state in ('proposed', 'picked')
    and auth.uid() is not null
  );
