-- NPC identities and non-payment Device allocations. Apply before app deployment.
-- No production data is seeded. claimed_quantity includes official allocations;
-- allocated_quantity identifies that subset without recording revenue/orders.
begin;

alter table public.voyager_profiles
  add column account_kind text not null default 'human'
  check (account_kind in ('human', 'npc'));

-- The Auth trigger uses trusted app metadata, never user-editable metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.voyager_profiles (id, display_name, role, email, experiment_group, account_kind)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when new.raw_app_meta_data->>'account_kind' = 'npc' then 'guest'::public.user_role else 'applicant'::public.user_role end,
    case when new.raw_app_meta_data->>'account_kind' = 'npc' then null else lower(new.email) end,
    case when new.raw_app_meta_data->>'account_kind' = 'npc' then null when random() < 0.5 then 'direct' else 'task_gated' end,
    case when new.raw_app_meta_data->>'account_kind' = 'npc' then 'npc' else 'human' end
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create function public.protect_npc_identity()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and
    (new.account_kind is distinct from old.account_kind or old.account_kind = 'npc') then
    raise exception 'NPC identities are managed by administrators';
  end if;
  if old.account_kind is distinct from new.account_kind then
    raise exception 'Account kind cannot be changed';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_npc_identity() from public;
create trigger voyager_profiles_protect_npc before update on public.voyager_profiles
for each row execute function public.protect_npc_identity();

alter table public.device_batches add column allocated_quantity integer not null default 0
  check (allocated_quantity >= 0 and allocated_quantity <= claimed_quantity);

create table public.device_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.voyager_profiles(id) on delete restrict,
  batch_slug text not null references public.device_batches(slug) on update cascade on delete restrict,
  kind text not null default 'npc' check (kind in ('npc', 'gift', 'internal')),
  status text not null default 'active' check (status in ('active', 'released')),
  created_by uuid not null references public.voyager_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  released_by uuid references public.voyager_profiles(id) on delete restrict,
  released_at timestamptz,
  check ((status = 'active' and released_by is null and released_at is null)
    or (status = 'released' and released_by is not null and released_at is not null))
);
create unique index device_batch_allocations_active_identity
  on public.device_batch_allocations(user_id, batch_slug) where status = 'active';
alter table public.device_batch_allocations enable row level security;
revoke all on public.device_batch_allocations from anon, authenticated;
grant select, insert, update on public.device_batch_allocations to service_role;

alter table public.device_batch_units add column allocation_id uuid unique
  references public.device_batch_allocations(id) on delete restrict;
alter table public.device_batch_units drop constraint device_batch_units_binding_check;
alter table public.device_batch_units add constraint device_batch_units_binding_check check (
  (status in ('available', 'retired') and order_id is null and allocation_id is null and user_id is null)
  or (status not in ('available', 'retired') and user_id is not null and
    ((order_id is not null and allocation_id is null) or (order_id is null and allocation_id is not null)))
);

-- Preserve allocated Units when resizing/re-coding a pool.
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
    where public.device_batch_units.order_id is null and public.device_batch_units.allocation_id is null;

  update public.device_batch_units
    set status = 'retired', updated_at = now()
    where batch_slug = new.slug
      and sequence_no > new.listing_quantity
      and status = 'available'
      and order_id is null and allocation_id is null;

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


-- One service-only transaction, sharing the order inventory lock (Batch first).
create function public.set_npc_device_allocation(p_actor_id uuid, p_user_id uuid, p_batch_slug text, p_allocate boolean)
returns text language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  batch public.device_batches%rowtype;
  unit public.device_batch_units%rowtype;
  allocation public.device_batch_allocations%rowtype;
begin
  if not exists (select 1 from public.voyager_profiles where id = p_actor_id and role = 'architect' and account_kind = 'human') then
    raise exception 'Architect permission required';
  end if;
  select * into batch from public.device_batches where slug = p_batch_slug for update;
  if not found then raise exception 'Batch not found'; end if;
  perform 1 from public.voyager_profiles where id = p_user_id and account_kind = 'npc' for share;
  if not found then raise exception 'NPC not found'; end if;
  select * into allocation from public.device_batch_allocations
    where user_id = p_user_id and batch_slug = p_batch_slug and status = 'active' for update;
  if p_allocate then
    if found then
      return (select unit_code from public.device_batch_units where allocation_id = allocation.id);
    end if;
    if batch.publication_status <> 'published' then raise exception 'Publish the Batch before allocating a device'; end if;
    if batch.claimed_quantity + batch.reserved_quantity >= batch.listing_quantity then
      raise exception 'No devices available in this Batch';
    end if;
    select * into unit from public.device_batch_units
      where batch_slug = p_batch_slug and status = 'available'
      order by sequence_no for update skip locked limit 1;
    if not found then raise exception 'No devices available in this Batch'; end if;
    insert into public.device_batch_allocations(user_id, batch_slug, created_by)
      values (p_user_id, p_batch_slug, p_actor_id) returning * into allocation;
    update public.device_batch_units set status = 'assigned', user_id = p_user_id,
      allocation_id = allocation.id, assigned_at = now(), released_at = null, updated_at = now()
      where id = unit.id;
    update public.device_batches set claimed_quantity = claimed_quantity + 1,
      allocated_quantity = allocated_quantity + 1, updated_at = now() where slug = p_batch_slug;
    return unit.unit_code;
  else
    if not found then return null; end if;
    select * into unit from public.device_batch_units where allocation_id = allocation.id for update;
    if not found or unit.status <> 'assigned' then raise exception 'Only an assigned NPC device can be released'; end if;
    update public.device_batch_units set status = 'available', user_id = null, allocation_id = null,
      assigned_at = null, released_at = now(), updated_at = now() where id = unit.id;
    update public.device_batch_allocations set status = 'released', released_by = p_actor_id,
      released_at = now() where id = allocation.id;
    update public.device_batches set claimed_quantity = claimed_quantity - 1,
      allocated_quantity = allocated_quantity - 1, updated_at = now() where slug = p_batch_slug;
    return unit.unit_code;
  end if;
end;
$$;
revoke all on function public.set_npc_device_allocation(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_npc_device_allocation(uuid, uuid, text, boolean) to service_role;

-- Enforce NPC authorship at the database boundary, including direct comment writes.
create function public.validate_npc_comment()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.voyager_profiles where id = new.author_id and account_kind = 'npc') then
    if current_user <> 'service_role' or not exists (
      select 1 from public.voyager_profiles where id = new.posted_by_id and role = 'architect' and account_kind = 'human'
    ) then raise exception 'NPC comments require an administrator'; end if;
    if new.subject_type = 'dreamcatcher' then raise exception 'NPCs cannot post to Dreamcatcher chat'; end if;
    perform 1 from public.device_batch_allocations
      where user_id = new.author_id and status = 'active'
        and (new.subject_type <> 'device_batch' or batch_slug = new.subject_id)
      for share;
    if not found then raise exception 'This NPC must hold a device in this Batch'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_npc_comment() from public;
create trigger comments_validate_npc before insert or update of author_id, posted_by_id, subject_type, subject_id
on public.comments for each row execute function public.validate_npc_comment();

commit;
