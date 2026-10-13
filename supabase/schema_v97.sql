-- v97: durable, service-only Meta Purchase outbox for future Initiation payments.
-- Requires v90. Does not open checkout or backfill historical paid orders.
begin;

alter table public.initiation_orders
  add column meta_attribution jsonb not null default '{}'::jsonb;

create table public.initiation_meta_purchases (
  order_id uuid primary key references public.initiation_orders(id) on delete cascade,
  event_id text not null unique,
  event_time timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  claim_token uuid,
  sent_at timestamptz,
  last_error text,
  meta_trace_id text,
  created_at timestamptz not null default now(),
  constraint initiation_meta_event_identity
    check (event_id = 'initiation_purchase_' || order_id::text),
  constraint initiation_meta_claim_required
    check (status <> 'processing' or (claimed_at is not null and claim_token is not null)),
  constraint initiation_meta_sent_timestamp
    check (status <> 'sent' or sent_at is not null)
);

alter table public.initiation_meta_purchases enable row level security;
revoke all privileges on table public.initiation_meta_purchases from public, anon, authenticated;
grant select, insert, update, delete on table public.initiation_meta_purchases to service_role;
create index initiation_meta_purchases_due
  on public.initiation_meta_purchases (next_attempt_at, event_time)
  where status in ('pending', 'processing');

-- Runs inside the payment-completion transaction: a crash after payment cannot
-- lose the queued Purchase. Review/refund/dispute and authorization-only states
-- never enqueue. The first paid timestamp and event identity survive all retries.
create function public.queue_initiation_meta_purchase() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.status <> 'paid' or new.product_type <> 'voyager_initiation' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'paid' then
    return new;
  end if;
  if new.paid_at is null then
    raise exception 'Confirmed Initiation payment requires a paid timestamp';
  end if;
  insert into public.initiation_meta_purchases (order_id, event_id, event_time, status)
  values (
    new.id, 'initiation_purchase_' || new.id::text, new.paid_at,
    case when new.meta_attribution -> 'disabled' = 'true'::jsonb then 'skipped' else 'pending' end
  )
  on conflict (order_id) do nothing;
  return new;
end;
$$;

create trigger initiation_meta_purchase_after_payment
  after insert or update of status on public.initiation_orders
  for each row execute function public.queue_initiation_meta_purchase();

-- Service-role-only atomic leases; parallel webhooks and the recovery cron
-- cannot claim the same order at once. A timed-out worker may reclaim after
-- five minutes, retaining the original event_id/event_time for Meta deduplication.
create function public.claim_initiation_meta_purchases(
  p_order uuid default null, p_limit integer default 10
) returns setof public.initiation_meta_purchases
language sql security invoker set search_path = public as $$
  with due as (
    select q.order_id
    from public.initiation_meta_purchases q
    where (p_order is null or q.order_id = p_order)
      and (
        (q.status = 'pending' and q.next_attempt_at <= now())
        or (q.status = 'processing' and q.claimed_at <= now() - interval '5 minutes')
      )
    order by q.next_attempt_at, q.event_time, q.order_id
    limit least(greatest(coalesce(p_limit, 10), 1), 20)
    for update skip locked
  )
  update public.initiation_meta_purchases q
  set status = 'processing', claimed_at = now(), claim_token = gen_random_uuid(),
      attempt_count = q.attempt_count + 1
  from due
  where q.order_id = due.order_id
  returning q.*;
$$;

revoke all privileges on function public.queue_initiation_meta_purchase(),
  public.claim_initiation_meta_purchases(uuid, integer) from public, anon, authenticated;
grant execute on function public.queue_initiation_meta_purchase(),
  public.claim_initiation_meta_purchases(uuid, integer) to service_role;

notify pgrst, 'reload schema';
commit;
