-- v129: repeatable, non-financial Shopify checkout observations. No historical backfill.
begin;
create table public.initiation_checkout_diagnostics (
  order_id uuid not null references public.initiation_orders(id) on delete cascade,
  event_key text not null check(event_key ~ '^[0-9a-f]{64}$'),
  event_uuid uuid not null default gen_random_uuid() unique,
  event text not null check(event in (
    'initiation_checkout_stage_observed','initiation_checkout_clicked','initiation_checkout_form_submitted',
    'initiation_checkout_input_focused','initiation_checkout_input_changed','initiation_checkout_input_blurred',
    'initiation_checkout_alert_displayed','initiation_checkout_extension_errored','initiation_checkout_transaction_observed'
  )),
  capture_source text not null check(capture_source in ('shopify_pixel','shopify_transaction')),
  event_time timestamptz not null,
  received_at timestamptz not null default now(),
  properties jsonb not null default '{}'::jsonb check(jsonb_typeof(properties)='object' and octet_length(properties::text)<=1024
    and properties - array['field_category','control','alert_type','extension_error_type','stage','shopify_seq',
      'transaction_kind','transaction_status','transaction_error_code','transaction_time_source']::text[] = '{}'::jsonb),
  status text not null default 'pending' check(status in ('pending','processing','sent','skipped')),
  attempt_count integer not null default 0 check(attempt_count>=0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,claim_token uuid,sent_at timestamptz,last_error text,
  primary key(order_id,event_key),
  check((capture_source='shopify_transaction')=(event='initiation_checkout_transaction_observed')),
  check(status<>'processing' or (claimed_at is not null and claim_token is not null)),
  check(status<>'sent' or sent_at is not null)
);
alter table public.initiation_checkout_diagnostics enable row level security;
revoke all privileges on public.initiation_checkout_diagnostics from public,anon,authenticated;
grant select,insert,update,delete on public.initiation_checkout_diagnostics to service_role;
create index initiation_checkout_diagnostics_due on public.initiation_checkout_diagnostics(next_attempt_at,event_time)
  where status in ('pending','processing');

create function public.claim_initiation_checkout_diagnostics(p_order uuid default null,p_limit integer default 10)
returns setof public.initiation_checkout_diagnostics
language sql security invoker set search_path=public as $$
  with due as (
    select q.order_id,q.event_key from public.initiation_checkout_diagnostics q
    where (p_order is null or q.order_id=p_order) and
      ((q.status='pending' and q.next_attempt_at<=now()) or
       (q.status='processing' and q.claimed_at<=now()-interval '5 minutes'))
    order by q.next_attempt_at,q.event_time,q.order_id,q.event_key
    limit least(greatest(coalesce(p_limit,10),1),20) for update skip locked
  )
  update public.initiation_checkout_diagnostics q
    set status='processing',claimed_at=now(),claim_token=gen_random_uuid(),attempt_count=q.attempt_count+1
    from due where q.order_id=due.order_id and q.event_key=due.event_key returning q.*;
$$;
revoke all privileges on function public.claim_initiation_checkout_diagnostics(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_initiation_checkout_diagnostics(uuid,integer) to service_role;
notify pgrst,'reload schema';
commit;
