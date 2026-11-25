-- v130: observational metadata and coverage only. Does not change payment/entitlement procedures.
begin;
alter table public.initiation_shopify_checkouts
  add column payment_method text not null default 'unknown'
    check(payment_method in ('unknown','card','shop_pay','shop_pay_installments','apple_pay','google_pay','paypal','other_wallet','other')),
  add column payment_method_updated_at timestamptz;

alter table public.initiation_checkout_diagnostics
  drop constraint initiation_checkout_diagnostics_event_check,
  drop constraint initiation_checkout_diagnostics_properties_check,
  drop constraint initiation_checkout_diagnostics_check,
  add constraint initiation_checkout_diagnostics_event_check check(event in (
    'initiation_checkout_stage_observed','initiation_checkout_clicked','initiation_checkout_form_submitted',
    'initiation_checkout_input_focused','initiation_checkout_input_changed','initiation_checkout_input_blurred',
    'initiation_checkout_alert_displayed','initiation_checkout_extension_errored','initiation_checkout_transaction_observed',
    'initiation_checkout_payment_method_observed')),
  add constraint initiation_checkout_diagnostics_properties_check check(jsonb_typeof(properties)='object'
    and octet_length(properties::text)<=1024 and properties - array[
      'field_category','control','alert_type','extension_error_type','stage','shopify_seq',
      'transaction_kind','transaction_status','transaction_error_code','transaction_time_source',
      'payment_method','checkout_flow','payment_method_evidence']::text[] = '{}'::jsonb),
  add constraint initiation_checkout_diagnostics_source_event_check check(
    (capture_source='shopify_transaction') = (event in ('initiation_checkout_transaction_observed','initiation_checkout_payment_method_observed')));

create function public.record_initiation_shopify_payment_method(
  p_order uuid,p_shop text,p_shopify_order text,p_method text,p_updated_at timestamptz
) returns void language plpgsql security invoker set search_path=public as $$
begin
  if p_method is null or p_method not in ('card','shop_pay','shop_pay_installments','apple_pay','google_pay','paypal','other_wallet','other')
    or p_updated_at is null or p_updated_at>now()+interval '1 minute'
    or p_shopify_order is null or p_shopify_order !~ '^gid://shopify/Order/[0-9]+$' then
    raise exception 'Invalid Shopify payment metadata';
  end if;
  -- The caller must verify the signed provider order, matching an existing provider binding.
  -- Unknown/older snapshots can never erase a confirmed classification.
  update initiation_shopify_checkouts c set payment_method=p_method,payment_method_updated_at=p_updated_at
    where c.order_id=p_order and c.shop=p_shop
      and c.shopify_order_id=p_shopify_order
      and (c.payment_method_updated_at is null or c.payment_method_updated_at<p_updated_at
        or (c.payment_method_updated_at=p_updated_at and c.payment_method=p_method));
end;
$$;
revoke all on function public.record_initiation_shopify_payment_method(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_initiation_shopify_payment_method(uuid,text,text,text,timestamptz) to service_role;

create table public.initiation_shopify_payment_metadata_queue (
  order_id uuid primary key references public.initiation_orders(id) on delete cascade,
  queued_at timestamptz not null default clock_timestamp(),
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check(attempt_count>=0)
);
alter table public.initiation_shopify_payment_metadata_queue enable row level security;
revoke all on public.initiation_shopify_payment_metadata_queue from public,anon,authenticated;
grant select,insert,update,delete on public.initiation_shopify_payment_metadata_queue to service_role;
create index initiation_shopify_payment_metadata_due on public.initiation_shopify_payment_metadata_queue(next_attempt_at);

create function public.queue_initiation_shopify_payment_metadata() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.shopify_order_id is null or not exists(select 1 from initiation_orders o where o.id=new.order_id
    and o.stripe_livemode and o.analytics_context->>'environment'='production'
    and coalesce(o.analytics_context->>'is_test','false')<>'true'
    and coalesce(o.analytics_context->>'is_internal_qa','false')<>'true') then return new; end if;
  insert into initiation_shopify_payment_metadata_queue(order_id) values(new.order_id)
    on conflict(order_id) do update set queued_at=clock_timestamp(),next_attempt_at=now(),attempt_count=0;
  return new;
end;
$$;
create trigger initiation_shopify_payment_metadata_after_binding
  after insert or update of shopify_order_id,capture_id on public.initiation_shopify_checkouts
  for each row execute function public.queue_initiation_shopify_payment_metadata();
revoke all on function public.queue_initiation_shopify_payment_metadata() from public,anon,authenticated;
grant execute on function public.queue_initiation_shopify_payment_metadata() to service_role;

-- Backfill metadata jobs only. The worker re-reads Shopify; no historical steps or purchases are invented.
insert into initiation_shopify_payment_metadata_queue(order_id)
  select c.order_id from initiation_shopify_checkouts c join initiation_orders o on o.id=c.order_id
  where c.shopify_order_id is not null and c.shop='jtuuus-k3.myshopify.com' and o.stripe_livemode
    and o.analytics_context->>'environment'='production'
    and coalesce(o.analytics_context->>'is_test','false')<>'true'
    and coalesce(o.analytics_context->>'is_internal_qa','false')<>'true';

-- Hourly aggregate counters have no order/person identifiers, signatures, URLs, input values or raw errors.
-- Unsigned browser reports are explicitly unverified and cannot alter any business record or funnel.
create table public.shopify_observation_health (
  hour_utc timestamptz not null,
  source text not null check(source in ('pixel_unverified','server')),
  reason text not null check(reason in ('missing_reference','invalid_reference','invalid_payload','binding_not_found',
    'reference_mismatch','event_time_rejected','storage_unavailable','ingest_rejected','network_failure')),
  observed_event text not null check(observed_event in ('unknown','checkout_started','checkout_contact_info_submitted',
    'checkout_address_info_submitted','checkout_shipping_info_submitted','payment_info_submitted','checkout_completed',
    'clicked','form_submitted','input_focused','input_changed','input_blurred','alert_displayed','ui_extension_errored')),
  occurrences integer not null default 1 check(occurrences between 1 and 100000),
  primary key(hour_utc,source,reason,observed_event)
);
alter table public.shopify_observation_health enable row level security;
revoke all on public.shopify_observation_health from public,anon,authenticated;
grant select,insert,update,delete on public.shopify_observation_health to service_role;

create function public.record_shopify_observation_failure(p_source text,p_reason text,p_event text)
returns void language sql security invoker set search_path=public as $$
  insert into shopify_observation_health(hour_utc,source,reason,observed_event)
    values(date_trunc('hour',now(),'UTC'),p_source,p_reason,p_event)
  on conflict(hour_utc,source,reason,observed_event) do update
    set occurrences=least(shopify_observation_health.occurrences+1,100000);
$$;
revoke all on function public.record_shopify_observation_failure(text,text,text) from public,anon,authenticated;
grant execute on function public.record_shopify_observation_failure(text,text,text) to service_role;

-- Link-created cohort, observed through a fixed cutoff. Counts are coverage facts, NOT a strict funnel.
-- The caller supplies the current internal-cohort / linked QA exclusion list; never infer it from Auth.
create function public.report_shopify_checkout_coverage(p_start timestamptz,p_end timestamptz,p_as_of timestamptz,p_excluded_users uuid[])
returns table(checkout_flow text,users bigint,orders bigint,page_activity_users bigint,initial_view_users bigint,
  contact_users bigint,address_users bigint,shipping_users bigint,payment_users bigint,completed_view_users bigint,
  paid_users bigint,paid_orders bigint,unpaid_users bigint,initial_view_unobserved_users bigint,
  contact_unobserved_users bigint,address_unobserved_users bigint,shipping_unobserved_users bigint,payment_unobserved_users bigint)
language plpgsql stable security invoker set search_path=public as $$
begin
  if p_start is null or p_end is null or p_as_of is null or p_start>=p_end or p_end>p_as_of or p_excluded_users is null then
    raise exception 'Require a complete cohort window, explicit cutoff and exclusion list';
  end if;
  return query
  with cohort as (
    select o.id,o.user_id,case when c.payment_method_updated_at<=p_as_of then c.payment_method else 'unknown' end as payment_method,
      (o.paid_at is not null and o.paid_at<=p_as_of and c.capture_id is not null and c.authorization_id is not null
        and c.capture_id<>c.authorization_id and c.shopify_order_id is not null) as paid,
      a.event_time as link_at
    from initiation_orders o join initiation_shopify_checkouts c on c.order_id=o.id
      join initiation_analytics_outbox a on a.order_id=o.id and a.event='initiation_checkout_started' and a.capture_source='server'
    where a.event_time>=p_start and a.event_time<p_end and o.stripe_livemode
      and c.shop='jtuuus-k3.myshopify.com' and c.checkout_url is not null
      and o.analytics_context->>'environment'='production'
      and coalesce(o.analytics_context->>'disabled','false')<>'true'
      and coalesce(o.analytics_context->>'is_test','false')<>'true'
      and coalesce(o.analytics_context->>'is_internal_qa','false')<>'true'
      and not (o.user_id=any(p_excluded_users))
  ), evidence as (
    select c.*,
      case when c.payment_method in ('shop_pay','shop_pay_installments') then 'shop_pay'
        when c.payment_method='card' then 'standard'
        when c.payment_method in ('apple_pay','google_pay','paypal','other_wallet') then 'other_express' else 'unknown' end as flow,
      coalesce(s.viewed,false) as viewed,coalesce(s.contact,false) as contact,coalesce(s.address,false) as address,
      coalesce(s.shipping,false) as shipping,coalesce(s.payment,false) as payment,coalesce(s.completed,false) as completed,
      coalesce(s.activity,false) or exists(select 1 from initiation_checkout_diagnostics d where d.order_id=c.id
        and d.capture_source='shopify_pixel' and d.event_time>=c.link_at-interval '1 minute' and d.event_time<=p_as_of) as activity
    from cohort c left join lateral (
      select bool_or(a.event='initiation_checkout_viewed') as viewed,
        bool_or(a.event='initiation_checkout_contact_submitted') as contact,
        bool_or(a.event='initiation_checkout_address_submitted') as address,
        bool_or(a.event='initiation_checkout_shipping_submitted') as shipping,
        bool_or(a.event='initiation_checkout_payment_submitted') as payment,
        bool_or(a.event='initiation_checkout_completed_viewed') as completed,true as activity
      from initiation_analytics_outbox a where a.order_id=c.id and a.capture_source='shopify_pixel'
        and a.event_time>=c.link_at-interval '1 minute' and a.event_time<=p_as_of
      having count(*)>0
    ) s on true
  ), per_user as (
    select e.flow,e.user_id,count(*) as order_count,count(*) filter(where e.paid) as paid_order_count,
      bool_or(e.paid) as paid,bool_or(e.activity) as activity,bool_or(e.viewed) as viewed,bool_or(e.contact) as contact,
      bool_or(e.address) as address,bool_or(e.shipping) as shipping,bool_or(e.payment) as payment,bool_or(e.completed) as completed
    from evidence e group by e.flow,e.user_id
  )
  select u.flow,count(*),sum(u.order_count)::bigint,count(*) filter(where u.activity),count(*) filter(where u.viewed),
    count(*) filter(where u.contact),count(*) filter(where u.address),count(*) filter(where u.shipping),count(*) filter(where u.payment),
    count(*) filter(where u.completed),count(*) filter(where u.paid),sum(u.paid_order_count)::bigint,count(*) filter(where not u.paid),
    count(*) filter(where not u.viewed),count(*) filter(where not u.contact),count(*) filter(where not u.address),
    count(*) filter(where not u.shipping),count(*) filter(where not u.payment)
  from per_user u group by u.flow order by u.flow;
end;
$$;
revoke all on function public.report_shopify_checkout_coverage(timestamptz,timestamptz,timestamptz,uuid[]) from public,anon,authenticated;
grant execute on function public.report_shopify_checkout_coverage(timestamptz,timestamptz,timestamptz,uuid[]) to service_role;
notify pgrst,'reload schema';
commit;
