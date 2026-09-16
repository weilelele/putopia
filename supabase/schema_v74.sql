-- Unified batch phase. Apply before deploying the new editor.
-- Legacy values are accepted only so stored records and rolling deploys keep working.
-- No existing batch is advanced, published or opened for purchase by this migration.
begin;
alter table public.device_batches drop constraint device_batches_device_status_check;
alter table public.device_batches add constraint device_batches_device_status_check
  check (device_status in ('searching', 'claiming', 'pack_one', 'pack_two', 'console', 'survey', 'claim_open', 'distribution', 'active'));
alter table public.device_batches alter column device_status set default 'searching';

create or replace function public.manage_device_batch_inventory()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  batch_record public.device_batches%rowtype;
  old_reserved boolean := false;
  new_reserved boolean;
  old_claimed boolean := false;
  new_claimed boolean;
  reserved_delta integer;
  claimed_delta integer;
  total_delta integer;
begin
  if new.product_type is distinct from 'device_batch_claim' then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and (
      old.product_type is distinct from new.product_type
      or old.device_batch_slug is distinct from new.device_batch_slug
    ) then
    raise exception 'Device Batch order identity cannot be changed';
  end if;

  select *
    into batch_record
    from public.device_batches
    where slug = new.device_batch_slug
    for update;

  if not found then
    raise exception 'Device Batch is not published in inventory';
  end if;

  new_reserved := new.status in ('pending', 'payment_review');
  new_claimed := new.status in ('paid', 'preparing', 'shipped', 'delivered');

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'New Device Batch claims must start pending';
    end if;
  else
    old_reserved := old.status in ('pending', 'payment_review');
    old_claimed := old.status in ('paid', 'preparing', 'shipped', 'delivered');
  end if;

  reserved_delta := new_reserved::integer - old_reserved::integer;
  claimed_delta := new_claimed::integer - old_claimed::integer;
  total_delta := reserved_delta + claimed_delta;

  if total_delta > 0 then
    if batch_record.publication_status <> 'published'
      or batch_record.device_status not in ('claim_open', 'claiming', 'pack_one', 'pack_two', 'console') then
      raise exception 'Device Batch claims are not open';
    end if;
    if batch_record.claimed_quantity
      + batch_record.reserved_quantity
      + total_delta
      > batch_record.listing_quantity then
      raise exception 'Device Batch is fully claimed';
    end if;
  end if;

  if batch_record.reserved_quantity + reserved_delta < 0
    or batch_record.claimed_quantity + claimed_delta < 0 then
    raise exception 'Device Batch inventory transition is inconsistent';
  end if;

  if reserved_delta <> 0 or claimed_delta <> 0 then
    update public.device_batches
      set reserved_quantity = reserved_quantity + reserved_delta,
          claimed_quantity = claimed_quantity + claimed_delta,
          updated_at = now()
      where id = batch_record.id;
  end if;

  return new;
end;
$$;

revoke all on function public.manage_device_batch_inventory() from public;

commit;
