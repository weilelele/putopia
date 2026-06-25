-- schema_v47.sql
-- Web Push subscriptions (Android PWA / web re-engagement channel).
--
-- One row per browser push subscription. A user can have several (multiple
-- devices/browsers). `endpoint` is the unique key — re-subscribing from the same
-- browser upserts rather than duplicating. The server sends via the service-role
-- client (bypasses RLS); the RLS policies below only matter for the rare case of
-- a client reading/deleting its own rows directly.
--
-- Idempotent.

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Users may see / remove only their own subscriptions. Inserts/updates go
-- through the server (service role), so no insert policy is granted to clients.
drop policy if exists "own push subscriptions: select" on public.push_subscriptions;
create policy "own push subscriptions: select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "own push subscriptions: delete" on public.push_subscriptions;
create policy "own push subscriptions: delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
