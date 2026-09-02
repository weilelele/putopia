-- schema_v68.sql -- Device Batch prerequisites, preserving main's iOS v57/v58.
-- Copies the Device branch's conflicting v57/v58 definitions without changing
-- the already-versioned main migrations. No migration is applied by merging.
-- IMPORTANT: on a main-only database, apply this prerequisite BEFORE v59-v67.
-- On a database with the original Device prerequisites, do not replay earlier
-- definitions over later migrations; verify the schema and follow the runbook.
-- See docs/releases/device-worlds-main-integration.md.

-- schema_v57.sql -- Distinguish device Batch claims from Voyager Pack orders.
-- Additive only. Existing rows remain `voyager_pack` orders.

alter table public.voyager_orders
  add column if not exists product_type      text not null default 'voyager_pack',
  add column if not exists device_batch_slug text,
  add column if not exists device_batch_code text,
  add column if not exists pack_count        integer not null default 1;

alter table public.voyager_orders
  drop constraint if exists voyager_orders_pack_count_positive;
alter table public.voyager_orders
  add constraint voyager_orders_pack_count_positive check (pack_count > 0);

create index if not exists voyager_orders_device_batch_idx
  on public.voyager_orders (device_batch_slug, status, created_at desc)
  where product_type = 'device_batch_claim';

-- A holder can claim multiple different Batches, but only one active claim for
-- the same Batch. Canceled, failed, and refunded attempts may be retried.
create unique index if not exists voyager_orders_one_active_device_claim
  on public.voyager_orders (user_id, device_batch_slug)
  where product_type = 'device_batch_claim'
    and status in ('pending', 'paid', 'preparing', 'shipped', 'delivered');

grant select, insert, update, delete on public.voyager_orders to service_role;

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
