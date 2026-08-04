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
