-- schema_v58.sql -- Device Batch follows and durable transactional email log.
-- Additive only. No email is sent by this migration.

create table if not exists public.device_batch_follows (
  user_id       uuid not null references auth.users(id) on delete cascade,
  batch_slug    text not null,
  email_enabled boolean not null default true,
  followed_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, batch_slug)
);

alter table public.device_batch_follows enable row level security;

drop policy if exists "device_batch_follows_select_own" on public.device_batch_follows;
create policy "device_batch_follows_select_own"
  on public.device_batch_follows for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "device_batch_follows_insert_own" on public.device_batch_follows;
create policy "device_batch_follows_insert_own"
  on public.device_batch_follows for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "device_batch_follows_update_own" on public.device_batch_follows;
create policy "device_batch_follows_update_own"
  on public.device_batch_follows for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "device_batch_follows_delete_own" on public.device_batch_follows;
create policy "device_batch_follows_delete_own"
  on public.device_batch_follows for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.device_batch_follows to authenticated;
grant select, insert, update, delete on public.device_batch_follows to service_role;

create table if not exists public.email_delivery_log (
  id              uuid primary key default gen_random_uuid(),
  event_key       text not null unique,
  user_id         uuid references auth.users(id) on delete set null,
  recipient       text not null,
  category        text not null,
  batch_slug      text,
  order_id        uuid references public.voyager_orders(id) on delete set null,
  status          text not null default 'pending',
  attempt_count   integer not null default 1,
  resend_id       text,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  sent_at         timestamptz
);

alter table public.email_delivery_log
  drop constraint if exists email_delivery_log_status_check;
alter table public.email_delivery_log
  add constraint email_delivery_log_status_check
  check (status in ('pending', 'sent', 'failed'));

create index if not exists email_delivery_log_user_idx
  on public.email_delivery_log (user_id, created_at desc);
create index if not exists email_delivery_log_batch_idx
  on public.email_delivery_log (batch_slug, category, created_at desc);

alter table public.email_delivery_log enable row level security;

drop policy if exists "email_delivery_log_select_own" on public.email_delivery_log;
create policy "email_delivery_log_select_own"
  on public.email_delivery_log for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.email_delivery_log to authenticated;
grant select, insert, update, delete on public.email_delivery_log to service_role;
