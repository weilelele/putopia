-- schema_v66.sql -- Cover Device Batch audit and ownership foreign keys.
-- Additive performance-only follow-up to schema_v64.sql.

create index if not exists device_batch_unit_events_actor_idx
  on public.device_batch_unit_events (actor_id)
  where actor_id is not null;

create index if not exists device_batch_unit_events_user_idx
  on public.device_batch_unit_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists device_batch_units_shipping_verifier_idx
  on public.device_batch_units (shipping_verified_by)
  where shipping_verified_by is not null;

create index if not exists device_order_packs_unit_idx
  on public.device_order_packs (unit_id)
  where unit_id is not null;

create index if not exists device_batch_versions_changed_by_idx
  on public.device_batch_versions (changed_by)
  where changed_by is not null;

create index if not exists device_batches_created_by_idx
  on public.device_batches (created_by)
  where created_by is not null;

create index if not exists device_batches_updated_by_idx
  on public.device_batches (updated_by)
  where updated_by is not null;

