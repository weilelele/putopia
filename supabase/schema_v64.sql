-- schema_v64.sql -- Device Unit assignment, Pack fulfillment, holder votes,
-- and persistent Batch discussions.
--
-- A physical Unit is reserved when a Device Batch order is inserted, assigned
-- when Stripe confirms payment, and must be verified by exact Unit code in the
-- same transaction that marks the order shipped.

create table if not exists public.device_batch_units (
  id                    bigint generated always as identity primary key,
  batch_slug            text not null references public.device_batches(slug) on update cascade on delete restrict,
  sequence_no           integer not null,
  unit_code             text not null unique,
  status                text not null default 'available',
  order_id              uuid unique references public.voyager_orders(id) on delete set null,
  user_id               uuid references auth.users(id) on delete set null,
  reserved_at           timestamptz,
  assigned_at           timestamptz,
  shipping_verified_at  timestamptz,
  shipping_verified_by  uuid references auth.users(id) on delete set null,
  shipped_at            timestamptz,
  delivered_at          timestamptz,
  released_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (batch_slug, sequence_no),
  constraint device_batch_units_sequence_check check (sequence_no > 0),
  constraint device_batch_units_code_check check (unit_code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'),
  constraint device_batch_units_status_check check (
    status in (
      'available', 'reserved', 'assigned', 'preparing', 'shipped',
      'delivered', 'return_pending', 'retired'
    )
  ),
  constraint device_batch_units_binding_check check (
    (status in ('available', 'retired') and order_id is null and user_id is null)
    or (status not in ('available', 'retired') and order_id is not null and user_id is not null)
  )
);

create index if not exists device_batch_units_pool_idx
  on public.device_batch_units (batch_slug, status, sequence_no);
create index if not exists device_batch_units_user_idx
  on public.device_batch_units (user_id, updated_at desc)
  where user_id is not null;

create table if not exists public.device_batch_unit_events (
  id          bigint generated always as identity primary key,
  unit_id     bigint not null references public.device_batch_units(id) on delete restrict,
  order_id    uuid references public.voyager_orders(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null,
  old_status  text,
  new_status  text not null,
  actor_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists device_batch_unit_events_unit_idx
  on public.device_batch_unit_events (unit_id, created_at desc);
create index if not exists device_batch_unit_events_order_idx
  on public.device_batch_unit_events (order_id, created_at desc)
  where order_id is not null;

create table if not exists public.device_order_packs (
  id                bigint generated always as identity primary key,
  order_id          uuid not null references public.voyager_orders(id) on delete cascade,
  unit_id           bigint references public.device_batch_units(id) on delete restrict,
  stage_id          text not null,
  stage_position    integer not null,
  label             text not null,
  expected_window   text,
  is_console_pack   boolean not null default false,
  status            text not null default 'planned',
  carrier           text,
  tracking_number   text,
  tracking_url      text,
  preparing_at      timestamptz,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (order_id, stage_id),
  constraint device_order_packs_position_check check (stage_position > 0),
  constraint device_order_packs_status_check check (
    status in ('planned', 'preparing', 'shipped', 'delivered', 'delayed', 'problem', 'canceled')
  )
);

create index if not exists device_order_packs_order_idx
  on public.device_order_packs (order_id, stage_position);
create index if not exists device_order_packs_status_idx
  on public.device_order_packs (status, updated_at desc);

alter table public.device_batch_units enable row level security;
alter table public.device_batch_unit_events enable row level security;
alter table public.device_order_packs enable row level security;

drop policy if exists "device_batch_units_own_read" on public.device_batch_units;
create policy "device_batch_units_own_read"
  on public.device_batch_units for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "device_order_packs_own_read" on public.device_order_packs;
create policy "device_order_packs_own_read"
  on public.device_order_packs for select
  to authenticated
  using (
    exists (
      select 1
      from public.voyager_orders orders
      where orders.id = device_order_packs.order_id
        and orders.user_id = (select auth.uid())
    )
  );

revoke all on public.device_batch_units from anon, authenticated;
revoke all on public.device_batch_unit_events from anon, authenticated;
revoke all on public.device_order_packs from anon, authenticated;
grant select on public.device_batch_units, public.device_order_packs to authenticated;
grant select, insert, update, delete on public.device_batch_units to service_role;
grant select, insert, update, delete on public.device_batch_unit_events to service_role;
grant select, insert, update, delete on public.device_order_packs to service_role;
grant usage, select on sequence public.device_batch_units_id_seq to service_role;
grant usage, select on sequence public.device_batch_unit_events_id_seq to service_role;
grant usage, select on sequence public.device_order_packs_id_seq to service_role;

create or replace function public.sync_device_batch_unit_pool()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  code_prefix text;
begin
  if tg_op = 'UPDATE' and old.code is distinct from new.code and exists (
    select 1 from public.device_batch_units
    where batch_slug = old.slug and status not in ('available', 'retired')
  ) then
    raise exception 'A Device Batch code cannot change after a Unit has been reserved';
  end if;

  code_prefix := trim(both '-' from regexp_replace(upper(new.code), '[^A-Z0-9]+', '-', 'g'));
  if code_prefix = '' then
    raise exception 'Device Batch code cannot generate Unit identifiers';
  end if;

  insert into public.device_batch_units (batch_slug, sequence_no, unit_code, status)
  select
    new.slug,
    sequence_no,
    code_prefix || '-' || lpad(sequence_no::text, 3, '0'),
    'available'
  from generate_series(1, new.listing_quantity) as sequence_no
  on conflict (batch_slug, sequence_no) do update
    set unit_code = excluded.unit_code,
        status = case
          when public.device_batch_units.status = 'retired' then 'available'
          else public.device_batch_units.status
        end,
        updated_at = now()
    where public.device_batch_units.order_id is null;

  update public.device_batch_units
    set status = 'retired', updated_at = now()
    where batch_slug = new.slug
      and sequence_no > new.listing_quantity
      and status = 'available'
      and order_id is null;

  if exists (
    select 1 from public.device_batch_units
    where batch_slug = new.slug
      and sequence_no > new.listing_quantity
      and status <> 'retired'
  ) then
    raise exception 'Listing quantity cannot retire a reserved or assigned Unit';
  end if;

  return new;
end;
$$;

revoke all on function public.sync_device_batch_unit_pool() from public;

drop trigger if exists device_batches_sync_unit_pool on public.device_batches;
create trigger device_batches_sync_unit_pool
after insert or update of listing_quantity, code on public.device_batches
for each row execute function public.sync_device_batch_unit_pool();

-- Create the pool for Batches that predate this migration.
insert into public.device_batch_units (batch_slug, sequence_no, unit_code, status)
select
  batches.slug,
  sequence_no,
  trim(both '-' from regexp_replace(upper(batches.code), '[^A-Z0-9]+', '-', 'g'))
    || '-' || lpad(sequence_no::text, 3, '0'),
  'available'
from public.device_batches batches
cross join lateral generate_series(1, batches.listing_quantity) as sequence_no
on conflict (batch_slug, sequence_no) do nothing;

create or replace function public.log_device_batch_unit_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status
    or old.shipping_verified_at is distinct from new.shipping_verified_at then
    insert into public.device_batch_unit_events (
      unit_id, order_id, user_id, event_type, old_status, new_status, actor_id
    ) values (
      new.id,
      coalesce(new.order_id, case when tg_op = 'UPDATE' then old.order_id end),
      coalesce(new.user_id, case when tg_op = 'UPDATE' then old.user_id end),
      case
        when tg_op = 'INSERT' then 'pool_created'
        when old.shipping_verified_at is null and new.shipping_verified_at is not null
          then 'shipping_verified'
        else 'status_changed'
      end,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      new.shipping_verified_by
    );
  end if;
  return new;
end;
$$;

revoke all on function public.log_device_batch_unit_change() from public;

drop trigger if exists device_batch_units_audit on public.device_batch_units;
create trigger device_batch_units_audit
after insert or update on public.device_batch_units
for each row execute function public.log_device_batch_unit_change();

create or replace function public.manage_device_order_unit_binding()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  bound_unit public.device_batch_units%rowtype;
begin
  if new.product_type is distinct from 'device_batch_claim' then
    return new;
  end if;
  if new.user_id is null then
    raise exception 'A Device Batch claim must belong to a user';
  end if;

  if tg_op = 'INSERT' then
    select * into bound_unit
      from public.device_batch_units
      where batch_slug = new.device_batch_slug and status = 'available'
      order by sequence_no
      for update skip locked
      limit 1;
    if not found then
      raise exception 'No physical Unit is available for this Device Batch';
    end if;
    update public.device_batch_units
      set status = 'reserved', order_id = new.id, user_id = new.user_id,
          reserved_at = now(), assigned_at = null, released_at = null,
          shipping_verified_at = null, shipping_verified_by = null,
          shipped_at = null, delivered_at = null, updated_at = now()
      where id = bound_unit.id;
    return new;
  end if;

  if old.device_batch_slug is distinct from new.device_batch_slug
    or old.user_id is distinct from new.user_id then
    raise exception 'A Device Batch Unit binding cannot be transferred';
  end if;

  select * into bound_unit
    from public.device_batch_units
    where order_id = new.id
    for update;

  if not found and new.status in ('pending', 'payment_review', 'paid', 'preparing', 'shipped', 'delivered') then
    raise exception 'Device Batch order has no physical Unit binding';
  end if;

  if not found then return new; end if;

  if new.status in ('pending', 'payment_review') then
    update public.device_batch_units
      set status = 'reserved', updated_at = now()
      where id = bound_unit.id;
  elsif new.status = 'paid' then
    update public.device_batch_units
      set status = 'assigned', assigned_at = coalesce(assigned_at, now()), updated_at = now()
      where id = bound_unit.id;
  elsif new.status = 'preparing' then
    update public.device_batch_units
      set status = 'preparing', assigned_at = coalesce(assigned_at, now()), updated_at = now()
      where id = bound_unit.id;
  elsif new.status = 'shipped' then
    if bound_unit.shipping_verified_at is null then
      raise exception 'Exact Device Unit code must be verified before shipping';
    end if;
    update public.device_batch_units
      set status = 'shipped', shipped_at = coalesce(shipped_at, now()), updated_at = now()
      where id = bound_unit.id;
  elsif new.status = 'delivered' then
    update public.device_batch_units
      set status = 'delivered', delivered_at = coalesce(delivered_at, now()), updated_at = now()
      where id = bound_unit.id;
  elsif new.status in ('payment_failed', 'canceled', 'refunded') then
    if bound_unit.status in ('shipped', 'delivered') then
      update public.device_batch_units
        set status = 'return_pending', updated_at = now()
        where id = bound_unit.id;
    else
      update public.device_batch_units
        set status = 'available', order_id = null, user_id = null,
            reserved_at = null, assigned_at = null, released_at = now(),
            shipping_verified_at = null, shipping_verified_by = null,
            shipped_at = null, delivered_at = null, updated_at = now()
        where id = bound_unit.id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.manage_device_order_unit_binding() from public;

drop trigger if exists zz_voyager_orders_device_unit_insert on public.voyager_orders;
create trigger zz_voyager_orders_device_unit_insert
after insert on public.voyager_orders
for each row
when (new.product_type = 'device_batch_claim')
execute function public.manage_device_order_unit_binding();

drop trigger if exists zz_voyager_orders_device_unit_update on public.voyager_orders;
create trigger zz_voyager_orders_device_unit_update
before update of status, user_id, device_batch_slug on public.voyager_orders
for each row
when (new.product_type = 'device_batch_claim')
execute function public.manage_device_order_unit_binding();

-- Bind any active historical orders. The production audit preceding this
-- migration found none, but this keeps deployments safe in other environments.
do $$
declare
  existing_order record;
  available_unit_id bigint;
begin
  for existing_order in
    select id, user_id, device_batch_slug, status, created_at
    from public.voyager_orders orders
    where product_type = 'device_batch_claim'
      and user_id is not null
      and status in ('pending', 'payment_review', 'paid', 'preparing', 'shipped', 'delivered')
      and not exists (select 1 from public.device_batch_units units where units.order_id = orders.id)
    order by created_at, id
  loop
    select id into available_unit_id
    from public.device_batch_units
    where batch_slug = existing_order.device_batch_slug and status = 'available'
    order by sequence_no
    for update skip locked
    limit 1;
    if available_unit_id is null then
      raise exception 'Cannot backfill Unit for Device Batch order %', existing_order.id;
    end if;
    update public.device_batch_units
      set order_id = existing_order.id,
          user_id = existing_order.user_id,
          status = case
            when existing_order.status in ('pending', 'payment_review') then 'reserved'
            when existing_order.status = 'preparing' then 'preparing'
            when existing_order.status = 'shipped' then 'shipped'
            when existing_order.status = 'delivered' then 'delivered'
            else 'assigned'
          end,
          reserved_at = existing_order.created_at,
          assigned_at = case when existing_order.status in ('paid', 'preparing', 'shipped', 'delivered') then existing_order.created_at end,
          shipping_verified_at = case when existing_order.status in ('shipped', 'delivered') then existing_order.created_at end,
          shipped_at = case when existing_order.status in ('shipped', 'delivered') then existing_order.created_at end,
          delivered_at = case when existing_order.status = 'delivered' then existing_order.created_at end,
          updated_at = now()
      where id = available_unit_id;
    available_unit_id := null;
  end loop;
end;
$$;

-- Inventory counters become projections of real bound Units. This removes
-- prototype counts without deleting any Batch, story, order, or Unit record.
update public.device_batches batches
set claimed_quantity = (
      select count(*)::integer from public.device_batch_units units
      where units.batch_slug = batches.slug
        and units.status in ('assigned', 'preparing', 'shipped', 'delivered', 'return_pending')
    ),
    reserved_quantity = (
      select count(*)::integer from public.device_batch_units units
      where units.batch_slug = batches.slug and units.status = 'reserved'
    ),
    updated_at = now();

create or replace function public.initialize_device_order_packs()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.product_type <> 'device_batch_claim'
    or new.status not in ('paid', 'preparing', 'shipped', 'delivered') then
    return new;
  end if;

  insert into public.device_order_packs (
    order_id, unit_id, stage_id, stage_position, label, expected_window, is_console_pack
  )
  select
    new.id,
    case when lower(coalesce(stage.value->>'id', '')) = 'console'
      or lower(coalesce(stage.value->>'label', '')) like '%console%'
      then units.id end,
    coalesce(nullif(stage.value->>'id', ''), 'stage-' || stage.ordinality),
    stage.ordinality::integer,
    coalesce(nullif(stage.value->>'label', ''), 'Distribution Pack ' || stage.ordinality),
    nullif(stage.value->>'window', ''),
    lower(coalesce(stage.value->>'id', '')) = 'console'
      or lower(coalesce(stage.value->>'label', '')) like '%console%'
  from public.device_batches batches
  join public.device_batch_units units on units.order_id = new.id
  cross join lateral jsonb_array_elements(
    coalesce(batches.published_content->'distributionStages', batches.content->'distributionStages', '[]'::jsonb)
  ) with ordinality as stage(value, ordinality)
  where batches.slug = new.device_batch_slug
  on conflict (order_id, stage_id) do nothing;

  update public.device_order_packs
    set status = case
          when new.status = 'delivered' then 'delivered'
          when new.status = 'shipped' then 'shipped'
          when new.status = 'preparing' then 'preparing'
          else status
        end,
        preparing_at = case when new.status = 'preparing' then coalesce(preparing_at, now()) else preparing_at end,
        shipped_at = case when new.status = 'shipped' then coalesce(shipped_at, new.shipped_at, now()) else shipped_at end,
        delivered_at = case when new.status = 'delivered' then coalesce(delivered_at, new.delivered_at, now()) else delivered_at end,
        updated_at = now()
    where order_id = new.id
      and is_console_pack = true
      and new.status in ('preparing', 'shipped', 'delivered');

  return new;
end;
$$;

revoke all on function public.initialize_device_order_packs() from public;

drop trigger if exists voyager_orders_initialize_device_packs on public.voyager_orders;
create trigger voyager_orders_initialize_device_packs
after insert or update of status on public.voyager_orders
for each row execute function public.initialize_device_order_packs();

-- Initialize Pack snapshots for historical paid claims.
update public.voyager_orders set status = status
where product_type = 'device_batch_claim'
  and status in ('paid', 'preparing', 'shipped', 'delivered');

create or replace function public.ship_device_order(
  p_order_id uuid,
  p_expected_unit_code text,
  p_carrier text,
  p_tracking_number text,
  p_architect_id uuid,
  p_tracking_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bound_unit public.device_batch_units%rowtype;
  shipped_order public.voyager_orders%rowtype;
begin
  if not exists (
    select 1 from public.voyager_profiles
    where id = p_architect_id and role = 'architect'
  ) then
    raise exception 'Architect permission required';
  end if;
  if nullif(btrim(p_tracking_number), '') is null then
    raise exception 'Tracking number is required before shipping';
  end if;

  select units.* into bound_unit
  from public.device_batch_units units
  join public.voyager_orders orders on orders.id = units.order_id
  where orders.id = p_order_id
    and orders.product_type = 'device_batch_claim'
    and orders.status in ('paid', 'preparing')
  for update of units;

  if not found then
    raise exception 'Order is not ready for Device Unit verification';
  end if;
  if upper(btrim(p_expected_unit_code)) <> bound_unit.unit_code then
    raise exception 'Device Unit code does not match the paid order';
  end if;

  update public.device_batch_units
    set shipping_verified_at = now(), shipping_verified_by = p_architect_id,
        updated_at = now()
    where id = bound_unit.id;

  update public.voyager_orders
    set status = 'shipped', carrier = nullif(btrim(p_carrier), ''),
        tracking_number = btrim(p_tracking_number),
        tracking_url = nullif(btrim(p_tracking_url), ''),
        shipped_at = now()
    where id = p_order_id
      and status in ('paid', 'preparing')
    returning * into shipped_order;

  if not found then
    raise exception 'Order status changed during shipping verification';
  end if;

  update public.device_order_packs
    set status = 'shipped', carrier = shipped_order.carrier,
        tracking_number = shipped_order.tracking_number,
        tracking_url = shipped_order.tracking_url,
        shipped_at = shipped_order.shipped_at, updated_at = now()
    where order_id = p_order_id and is_console_pack = true;

  return jsonb_build_object(
    'order_id', shipped_order.id,
    'unit_code', bound_unit.unit_code,
    'status', shipped_order.status
  );
end;
$$;

revoke all on function public.ship_device_order(uuid, text, text, text, uuid, text) from public;
grant execute on function public.ship_device_order(uuid, text, text, text, uuid, text) to service_role;

-- Attach holder-only decisions to the existing voting system. Reads and writes
-- are still performed through server actions that verify a paid Unit binding.
alter table public.votes
  add column if not exists device_batch_slug text references public.device_batches(slug) on update cascade on delete cascade;

create unique index if not exists votes_one_active_device_batch_decision
  on public.votes (device_batch_slug)
  where device_batch_slug is not null and is_active = true;
create index if not exists votes_device_batch_idx
  on public.votes (device_batch_slug, created_at desc)
  where device_batch_slug is not null;

-- Holder decisions are created explicitly by architects from /admin/votes.
-- No prototype decisions or vote totals are seeded into a real environment.
