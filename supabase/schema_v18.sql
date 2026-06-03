-- schema_v18: persistent comments table
-- Replaces the previous ephemeral (in-memory) comment UIs with real rows.
-- Generic by design: subject_type lets the same table back device / intel / world threads.

create table if not exists comments (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- what is being commented on
  subject_type      text        not null,   -- 'device' | 'intel' | 'world'
  subject_id        text        not null,   -- devices.id / intel.id / worlds.id

  -- author (denormalized so the thread survives profile edits/deletes)
  author_id         uuid        references voyager_profiles(id) on delete set null,
  author_name       text        not null,
  author_avatar_url text,

  body              text        not null,

  -- admin/author soft-moderation
  is_visible        boolean     not null default true
);

-- thread reads are always scoped to one subject, oldest-first
create index if not exists comments_subject_idx
  on comments (subject_type, subject_id, created_at);

-- RLS: authenticated members can read visible comments; only service_role writes
alter table comments enable row level security;

create policy "visible comments readable by authenticated"
  on comments for select
  to authenticated
  using (is_visible = true);

create policy "service role full access on comments"
  on comments for all
  to service_role
  using (true)
  with check (true);
