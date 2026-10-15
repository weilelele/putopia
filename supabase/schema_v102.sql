-- v102: independent durable PostHog funnel outbox. No historical backfill.
begin;
alter table public.initiation_orders add column analytics_context jsonb not null default '{}'::jsonb;
create table public.initiation_analytics_outbox (
  order_id uuid not null references public.initiation_orders(id) on delete cascade,
  event text not null check(event in ('initiation_checkout_started','initiation_purchase_completed')),
  event_uuid uuid not null default gen_random_uuid() unique,
  event_time timestamptz not null,
  reused boolean not null default false,
  status text not null default 'pending' check(status in ('pending','processing','sent','skipped')),
  attempt_count integer not null default 0 check(attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz, claim_token uuid, sent_at timestamptz, last_error text,
  primary key(order_id,event),
  check(status <> 'processing' or (claimed_at is not null and claim_token is not null)),
  check(status <> 'sent' or sent_at is not null)
);
alter table public.initiation_analytics_outbox enable row level security;
revoke all privileges on public.initiation_analytics_outbox from public,anon,authenticated;
grant select,insert,update,delete on public.initiation_analytics_outbox to service_role;
create index initiation_analytics_due on public.initiation_analytics_outbox(next_attempt_at,event_time)
  where status in ('pending','processing');

create function public.queue_initiation_analytics() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.product_type <> 'voyager_initiation' then return new; end if;
  if new.stripe_session_id is not null and new.status='pending'
    and (tg_op='INSERT' or old.stripe_session_id is null) then
    insert into public.initiation_analytics_outbox(order_id,event,event_time,status)
    values(new.id,'initiation_checkout_started',now(),case when new.analytics_context->'disabled'='true'::jsonb then 'skipped' else 'pending' end)
    on conflict(order_id,event) do nothing;
  end if;
  if new.status='paid' and (tg_op='INSERT' or old.status<>'paid') then
    if new.paid_at is null then raise exception 'Confirmed payment requires a paid timestamp'; end if;
    insert into public.initiation_analytics_outbox(order_id,event,event_time,status)
    values(new.id,'initiation_purchase_completed',new.paid_at,case when new.analytics_context->'disabled'='true'::jsonb then 'skipped' else 'pending' end)
    on conflict(order_id,event) do nothing;
  end if;
  return new;
end;
$$;
create trigger initiation_analytics_after_order
  after insert or update of status,stripe_session_id on public.initiation_orders
  for each row execute function public.queue_initiation_analytics();

-- Used only after the server re-verifies an existing open Stripe checkout.
create function public.queue_initiation_checkout_analytics(p_order uuid,p_reused boolean) returns void
language sql security invoker set search_path=public as $$
  insert into public.initiation_analytics_outbox(order_id,event,event_time,reused,status)
  select id,'initiation_checkout_started',now(),p_reused,
    case when analytics_context->'disabled'='true'::jsonb then 'skipped' else 'pending' end
  from public.initiation_orders where id=p_order and status='pending'
    and product_type='voyager_initiation' and stripe_session_id is not null
  on conflict(order_id,event) do nothing;
$$;

create function public.claim_initiation_analytics(p_order uuid default null,p_limit integer default 5)
returns setof public.initiation_analytics_outbox
language sql security invoker set search_path=public as $$
  with due as (
    select q.order_id,q.event from public.initiation_analytics_outbox q
    where (p_order is null or q.order_id=p_order) and
      ((q.status='pending' and q.next_attempt_at<=now()) or (q.status='processing' and q.claimed_at<=now()-interval '5 minutes'))
    order by q.next_attempt_at,q.event_time,q.order_id,q.event
    limit least(greatest(coalesce(p_limit,5),1),5) for update skip locked
  )
  update public.initiation_analytics_outbox q set status='processing',claimed_at=now(),claim_token=gen_random_uuid(),attempt_count=q.attempt_count+1
  from due where q.order_id=due.order_id and q.event=due.event returning q.*;
$$;
revoke all privileges on function public.queue_initiation_analytics(),public.queue_initiation_checkout_analytics(uuid,boolean),
  public.claim_initiation_analytics(uuid,integer) from public,anon,authenticated;
grant execute on function public.queue_initiation_analytics(),public.queue_initiation_checkout_analytics(uuid,boolean),
  public.claim_initiation_analytics(uuid,integer) to service_role;
notify pgrst,'reload schema';
commit;
