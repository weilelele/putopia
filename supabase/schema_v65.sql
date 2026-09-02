-- schema_v65.sql -- Reset prototype Device Batch operations to an auditable,
-- truthful zero state without deleting Batch identities, stories, or orders.
-- Depends on schema_v64.sql.

create table if not exists public.device_batch_reset_snapshots (
  id          uuid primary key default gen_random_uuid(),
  reason      text not null,
  snapshot    jsonb not null,
  created_at  timestamptz not null default now(),
  constraint device_batch_reset_snapshots_object_check
    check (jsonb_typeof(snapshot) = 'object')
);

alter table public.device_batch_reset_snapshots enable row level security;
revoke all on public.device_batch_reset_snapshots from anon, authenticated;
grant select, insert on public.device_batch_reset_snapshots to service_role;

insert into public.device_batch_reset_snapshots (reason, snapshot)
select
  'Remove pre-launch Device Batch prototype operations; retain stories and order audit',
  jsonb_build_object(
    'batches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'slug', slug,
        'publication_status', publication_status,
        'device_status', device_status,
        'listing_quantity', listing_quantity,
        'claimed_quantity', claimed_quantity,
        'reserved_quantity', reserved_quantity,
        'revision', revision,
        'content', content,
        'published_content', published_content
      ) order by slug)
      from public.device_batches
    ), '[]'::jsonb),
    'device_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'device_batch_slug', device_batch_slug,
        'status', status,
        'amount', amount,
        'currency', currency,
        'checkout_expires_at', checkout_expires_at,
        'created_at', created_at,
        'paid_at', paid_at
      ) order by created_at)
      from public.voyager_orders
      where product_type = 'device_batch_claim'
    ), '[]'::jsonb),
    'follows', coalesce((
      select jsonb_agg(to_jsonb(follows) order by followed_at)
      from public.device_batch_follows follows
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(to_jsonb(comments) order by created_at)
      from public.comments comments
      where subject_type = 'device_batch'
    ), '[]'::jsonb),
    'votes', coalesce((
      select jsonb_agg(to_jsonb(votes) order by created_at)
      from public.votes votes
      where device_batch_slug is not null
    ), '[]'::jsonb)
  );

-- The only pre-launch Device order is an expired, unpaid Checkout. Keep the
-- order and its status history, but release its inventory reservation.
update public.voyager_orders
set status = 'canceled'
where product_type = 'device_batch_claim'
  and paid_at is null
  and status in ('pending', 'payment_review', 'payment_failed')
  and checkout_expires_at < now();

delete from public.comments
where subject_type = 'device_batch';

delete from public.votes
where device_batch_slug is not null;

delete from public.device_batch_follows;

-- Keep each Batch page and its editorial story online, while resetting every
-- operational field to values backed by real inventory (currently zero).
update public.device_batches
set device_status = 'survey',
    listing_quantity = 0,
    claimed_quantity = 0,
    reserved_quantity = 0,
    content = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(content, '{holders}', '[]'::jsonb, true),
          '{status}', '"survey"'::jsonb, true
        ),
        '{statusLine}', '"0 verified units currently listed"'::jsonb, true
      ),
      '{nextMilestone}', '"Awaiting verified field data"'::jsonb, true
    ),
    published_content = case
      when published_content is null then null
      else jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(published_content, '{holders}', '[]'::jsonb, true),
            '{status}', '"survey"'::jsonb, true
          ),
          '{statusLine}', '"0 verified units currently listed"'::jsonb, true
        ),
        '{nextMilestone}', '"Awaiting verified field data"'::jsonb, true
      )
    end,
    has_unpublished_changes = false,
    revision = revision + 1,
    updated_at = now();

update public.device_batches
set content = jsonb_set(
      jsonb_set(content, '{availability}', to_jsonb('No verified inventory listed'::text), true),
      '{updatedAt}', to_jsonb(to_char(current_date, 'Mon DD, YYYY')), true
    ),
    published_content = case
      when published_content is null then null
      else jsonb_set(
        jsonb_set(published_content, '{availability}', to_jsonb('No verified inventory listed'::text), true),
        '{updatedAt}', to_jsonb(to_char(current_date, 'Mon DD, YYYY')), true
      )
    end;

insert into public.device_batch_versions (
  batch_id, revision, publication_status, content, changed_by
)
select id, revision, publication_status, content, null
from public.device_batches;

-- Generated prototype Unit identifiers are not real inventory. At listing
-- quantity zero they are unbound, so remove them and their generated events.
delete from public.device_order_packs packs
using public.voyager_orders orders
where packs.order_id = orders.id
  and orders.product_type = 'device_batch_claim';

delete from public.device_batch_unit_events events
where exists (
  select 1
  from public.device_batch_units units
  where units.id = events.unit_id and units.order_id is null
);

delete from public.device_batch_units
where order_id is null;
