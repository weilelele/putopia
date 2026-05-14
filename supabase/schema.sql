-- Putopia Collective — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ─────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────

create type public.user_role as enum ('guest', 'applicant', 'voyager', 'architect');
create type public.vote_scope as enum ('public', 'applicant', 'voyager', 'architect');
create type public.vote_type as enum ('single', 'multi');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.device_status as enum ('available', 'in_use', 'needs_repair', 'unknown');

-- ─────────────────────────────────────────
-- voyager_profiles
-- ─────────────────────────────────────────

create table public.voyager_profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text not null,
  bio             text,
  avatar_url      text,
  social_x        text,
  social_instagram text,
  social_linkedin  text,
  location        text,
  role            public.user_role not null default 'applicant',
  observation_days integer not null default 0,
  worlds_discovered integer not null default 0,
  joined_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.voyager_profiles enable row level security;

-- Anyone can read public profile fields
create policy "profiles_select_all"
  on public.voyager_profiles for select
  using (true);

-- Users can update their own profile
create policy "profiles_update_own"
  on public.voyager_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Architects can update any profile (role promotion, stats)
create policy "profiles_update_architect"
  on public.voyager_profiles for update
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- Profile is auto-created on sign-up via trigger (see bottom of file)

-- ─────────────────────────────────────────
-- applications
-- ─────────────────────────────────────────

create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  location    text,
  reason      text not null,
  status      public.application_status not null default 'pending',
  created_at  timestamptz not null default now(),
  reviewed_by uuid references public.voyager_profiles(id),
  reviewed_at timestamptz
);

alter table public.applications enable row level security;

-- Anyone (including guests) can submit an application
create policy "applications_insert_public"
  on public.applications for insert
  with check (true);

-- Applicants can read their own application (matched by email against auth.email())
create policy "applications_select_own"
  on public.applications for select
  using (email = auth.email());

-- Architects can read and update all applications
create policy "applications_select_architect"
  on public.applications for select
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

create policy "applications_update_architect"
  on public.applications for update
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- ─────────────────────────────────────────
-- votes
-- ─────────────────────────────────────────

create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  type        public.vote_type not null default 'single',
  scope       public.vote_scope not null default 'voyager',
  options     jsonb not null default '[]',  -- [{id, label}]
  is_active   boolean not null default true,
  created_by  uuid references public.voyager_profiles(id),
  created_at  timestamptz not null default now(),
  ends_at     timestamptz
);

alter table public.votes enable row level security;

-- Public-scoped votes are readable by everyone
create policy "votes_select_public"
  on public.votes for select
  using (scope = 'public' and is_active = true);

-- Applicant+ can read applicant-scoped votes
create policy "votes_select_applicant"
  on public.votes for select
  using (
    scope in ('applicant', 'voyager', 'architect')
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('applicant', 'voyager', 'architect')
    )
  );

-- Voyager+ can read voyager-scoped votes
create policy "votes_select_voyager"
  on public.votes for select
  using (
    scope in ('voyager', 'architect')
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role in ('voyager', 'architect')
    )
  );

-- Architects can read all votes and create/update
create policy "votes_all_architect"
  on public.votes for all
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- ─────────────────────────────────────────
-- vote_responses
-- ─────────────────────────────────────────

create table public.vote_responses (
  id               uuid primary key default gen_random_uuid(),
  vote_id          uuid not null references public.votes(id) on delete cascade,
  user_id          uuid references public.voyager_profiles(id),
  anon_token       text,  -- browser fingerprint for unauthenticated public votes
  selected_options text[] not null,
  created_at       timestamptz not null default now(),

  -- Prevent duplicate responses: one per user per vote, or one per anon token per vote
  constraint one_response_per_user unique (vote_id, user_id),
  constraint one_response_per_anon unique (vote_id, anon_token)
);

alter table public.vote_responses enable row level security;

-- Users can insert their own response
create policy "responses_insert_own"
  on public.vote_responses for insert
  with check (
    user_id = auth.uid()
    or (user_id is null and anon_token is not null)  -- anonymous public vote
  );

-- Users can read their own responses
create policy "responses_select_own"
  on public.vote_responses for select
  using (user_id = auth.uid());

-- Architects can read all responses
create policy "responses_select_architect"
  on public.vote_responses for select
  using (
    exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- ─────────────────────────────────────────
-- Storage bucket: avatars
-- ─────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────
-- Trigger: auto-create profile on sign-up
-- ─────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.voyager_profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'applicant'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- Trigger: updated_at auto-update
-- ─────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger voyager_profiles_updated_at
  before update on public.voyager_profiles
  for each row execute procedure public.set_updated_at();
