-- schema_v59.sql -- Persistent Device Batch publishing and atomic inventory.
-- Depends on schema_v57.sql (device order columns).

create table if not exists public.device_batches (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  code                text not null unique,
  name                text not null,
  publication_status  text not null default 'draft',
  device_status       text not null default 'survey',
  listing_quantity    integer not null default 0,
  claimed_quantity    integer not null default 0,
  reserved_quantity   integer not null default 0,
  price_amount        numeric(12, 2),
  price_currency      text,
  content             jsonb not null,
  published_content   jsonb,
  has_unpublished_changes boolean not null default true,
  revision            integer not null default 1,
  created_by          uuid references auth.users(id) on delete set null,
  updated_by          uuid references auth.users(id) on delete set null,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.device_batches
  drop constraint if exists device_batches_publication_status_check;
alter table public.device_batches
  add constraint device_batches_publication_status_check
  check (publication_status in ('draft', 'published', 'archived'));

alter table public.device_batches
  drop constraint if exists device_batches_device_status_check;
alter table public.device_batches
  add constraint device_batches_device_status_check
  check (device_status in ('survey', 'claim_open', 'distribution', 'active'));

alter table public.device_batches
  drop constraint if exists device_batches_inventory_check;
alter table public.device_batches
  add constraint device_batches_inventory_check
  check (
    listing_quantity >= 0
    and claimed_quantity >= 0
    and reserved_quantity >= 0
    and claimed_quantity + reserved_quantity <= listing_quantity
  );

alter table public.device_batches
  drop constraint if exists device_batches_price_check;
alter table public.device_batches
  add constraint device_batches_price_check
  check (
    (price_amount is null and price_currency is null)
    or (
      price_amount > 0
      and price_currency ~ '^[A-Z]{3}$'
    )
  );

alter table public.device_batches
  drop constraint if exists device_batches_content_object_check;
alter table public.device_batches
  add constraint device_batches_content_object_check
  check (jsonb_typeof(content) = 'object');

alter table public.device_batches
  drop constraint if exists device_batches_published_content_object_check;
alter table public.device_batches
  add constraint device_batches_published_content_object_check
  check (
    published_content is null
    or jsonb_typeof(published_content) = 'object'
  );

create index if not exists device_batches_public_registry_idx
  on public.device_batches (publication_status, updated_at desc);

create table if not exists public.device_batch_versions (
  id                  bigint generated always as identity primary key,
  batch_id            uuid not null references public.device_batches(id) on delete cascade,
  revision            integer not null,
  publication_status  text not null,
  content             jsonb not null,
  changed_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (batch_id, revision)
);

create index if not exists device_batch_versions_batch_idx
  on public.device_batch_versions (batch_id, revision desc);

alter table public.device_batches enable row level security;
alter table public.device_batch_versions enable row level security;

drop policy if exists "device_batches_public_read" on public.device_batches;
create policy "device_batches_public_read"
  on public.device_batches for select
  to anon, authenticated
  using (publication_status = 'published');

grant select on public.device_batches to anon, authenticated;
grant select, insert, update, delete on public.device_batches to service_role;
grant select, insert, update, delete on public.device_batch_versions to service_role;
grant usage, select on sequence public.device_batch_versions_id_seq to service_role;

revoke all on public.device_batch_versions from anon, authenticated;

create or replace function public.manage_device_batch_inventory()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  batch_record public.device_batches%rowtype;
  old_reserved boolean;
  new_reserved boolean;
  old_claimed boolean;
  new_claimed boolean;
begin
  if new.product_type is distinct from 'device_batch_claim' then
    return new;
  end if;

  select *
    into batch_record
    from public.device_batches
    where slug = new.device_batch_slug
    for update;

  if not found then
    raise exception 'Device Batch is not published in inventory';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'New Device Batch claims must start pending';
    end if;
    if batch_record.publication_status <> 'published'
      or batch_record.device_status <> 'claim_open' then
      raise exception 'Device Batch claims are not open';
    end if;
    if batch_record.claimed_quantity + batch_record.reserved_quantity
      >= batch_record.listing_quantity then
      raise exception 'Device Batch is fully claimed';
    end if;

    update public.device_batches
      set reserved_quantity = reserved_quantity + 1,
          updated_at = now()
      where id = batch_record.id;
    return new;
  end if;

  old_reserved := old.status in ('pending', 'payment_review');
  new_reserved := new.status in ('pending', 'payment_review');
  old_claimed := old.status in ('paid', 'preparing', 'shipped', 'delivered');
  new_claimed := new.status in ('paid', 'preparing', 'shipped', 'delivered');

  if old_reserved and new_claimed then
    update public.device_batches
      set reserved_quantity = greatest(reserved_quantity - 1, 0),
          claimed_quantity = claimed_quantity + 1,
          updated_at = now()
      where id = batch_record.id;
  elsif old_reserved and not new_reserved then
    update public.device_batches
      set reserved_quantity = greatest(reserved_quantity - 1, 0),
          updated_at = now()
      where id = batch_record.id;
  elsif not old_reserved and not old_claimed and new_claimed then
    if batch_record.claimed_quantity + batch_record.reserved_quantity
      >= batch_record.listing_quantity then
      raise exception 'Device Batch is fully claimed';
    end if;
    update public.device_batches
      set claimed_quantity = claimed_quantity + 1,
          updated_at = now()
      where id = batch_record.id;
  elsif old_claimed and not new_claimed then
    update public.device_batches
      set claimed_quantity = greatest(claimed_quantity - 1, 0),
          updated_at = now()
      where id = batch_record.id;
  end if;

  return new;
end;
$$;

revoke all on function public.manage_device_batch_inventory() from public;

drop trigger if exists voyager_orders_device_batch_inventory_insert
  on public.voyager_orders;
create trigger voyager_orders_device_batch_inventory_insert
before insert on public.voyager_orders
for each row
when (new.product_type = 'device_batch_claim')
execute function public.manage_device_batch_inventory();

drop trigger if exists voyager_orders_device_batch_inventory_update
  on public.voyager_orders;
create trigger voyager_orders_device_batch_inventory_update
before update of status on public.voyager_orders
for each row
when (
  old.product_type = 'device_batch_claim'
  and new.product_type = 'device_batch_claim'
  and old.status is distinct from new.status
)
execute function public.manage_device_batch_inventory();
