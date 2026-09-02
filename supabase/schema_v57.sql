-- schema_v57.sql — iOS push devices, preferences, and delivery audit
-- Additive and idempotent. Run after schema_v56.sql.

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.voyager_profiles(id) on delete cascade,
  platform text not null default 'ios' check (platform in ('ios')),
  token text not null unique,
  environment text not null default 'production' check (environment in ('development', 'production')),
  app_id text not null default 'org.multiverseco.collective',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_devices_user_enabled_idx
  on public.push_devices (user_id, enabled);

alter table public.push_devices enable row level security;

drop policy if exists "push_devices_select_own" on public.push_devices;
create policy "push_devices_select_own"
  on public.push_devices for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_devices_delete_own" on public.push_devices;
create policy "push_devices_delete_own"
  on public.push_devices for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.push_preferences (
  user_id uuid primary key references public.voyager_profiles(id) on delete cascade,
  replies boolean not null default true,
  signal boolean not null default true,
  worlds boolean not null default true,
  votes boolean not null default true,
  devices boolean not null default true,
  intel boolean not null default true,
  stories boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_preferences enable row level security;

drop policy if exists "push_preferences_select_own" on public.push_preferences;
create policy "push_preferences_select_own"
  on public.push_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_preferences_insert_own" on public.push_preferences;
create policy "push_preferences_insert_own"
  on public.push_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_preferences_update_own" on public.push_preferences;
create policy "push_preferences_update_own"
  on public.push_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.voyager_profiles(id) on delete cascade,
  device_id uuid references public.push_devices(id) on delete set null,
  event_type text not null,
  route text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_status integer,
  provider_reason text,
  created_at timestamptz not null default now()
);

create index if not exists push_delivery_log_user_created_idx
  on public.push_delivery_log (user_id, created_at desc);

alter table public.push_delivery_log enable row level security;

-- Delivery logs are server-managed. Members do not need direct table access.
revoke all on public.push_delivery_log from anon, authenticated;
grant select on public.push_devices, public.push_preferences to authenticated;
grant insert, update on public.push_preferences to authenticated;
grant delete on public.push_devices to authenticated;

