-- schema_v20.sql -- Paid Voyager membership foundation (additive + idempotent)
--  1) batches table (single "current" batch) + seeds 2026 Batch S2 as current
--  2) membership columns on voyager_profiles (paid vs granted, member number, since)
--  3) voyager_orders table (Stripe payment + US shipping address + fulfillment/tracking)

-- 1) Batches -----------------------------------------------------------------
create table if not exists public.batches (
  id          uuid primary key default gen_random_uuid(),
  label       text unique not null,
  sort_index  integer not null default 0,
  is_current  boolean not null default false,
  opened_at   timestamptz not null default now()
);

create unique index if not exists batches_one_current
  on public.batches (is_current) where is_current;

alter table public.batches enable row level security;
drop policy if exists "batches_select_all" on public.batches;
create policy "batches_select_all" on public.batches for select using (true);

insert into public.batches (label, sort_index, is_current)
values ('Original Batch', 0, false) on conflict (label) do nothing;
insert into public.batches (label, sort_index, is_current)
values ('2026 Batch S2', 1, true) on conflict (label) do nothing;

-- 2) Membership columns ------------------------------------------------------
create sequence if not exists public.voyager_member_no_seq;

alter table public.voyager_profiles
  add column if not exists member_source text not null default 'granted',
  add column if not exists member_no     integer,
  add column if not exists member_since  timestamptz;

-- 3) Orders ------------------------------------------------------------------
create table if not exists public.voyager_orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users on delete set null,
  email                 text,
  stripe_session_id     text unique,
  stripe_payment_intent text,
  amount                integer,
  currency              text not null default 'usd',
  status                text not null default 'pending',
  batch_label           text,
  display_name          text,
  recipient_name        text,
  address_line1         text,
  address_line2         text,
  city                  text,
  state                 text,
  postal_code           text,
  country               text not null default 'US',
  phone                 text,
  carrier               text,
  tracking_number       text,
  tracking_url          text,
  paid_at               timestamptz,
  shipped_at            timestamptz,
  delivered_at          timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists voyager_orders_user_idx on public.voyager_orders (user_id);

alter table public.voyager_orders enable row level security;
drop policy if exists "orders_select_own" on public.voyager_orders;
create policy "orders_select_own" on public.voyager_orders for select
  using (auth.uid() = user_id);

-- Explicit grants for service_role (needed for JS client inserts/updates).
-- The supabase_admin role grants these at creation time for built-in tables,
-- but custom tables require an explicit GRANT.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voyager_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO service_role;
