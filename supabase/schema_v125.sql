-- Shopify checkout analytics. Apply before the corresponding application release.
-- Payment capture already queues purchase through initiation_analytics_after_order (v102).
-- This migration observes newly bound checkout URLs. Existing rows are not backfilled.
begin;

create function public.queue_initiation_shopify_checkout_analytics() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if new.checkout_url is not null and (tg_op='INSERT' or old.checkout_url is null) then
    insert into public.initiation_analytics_outbox(order_id,event,event_time,status)
    select o.id,'initiation_checkout_started',clock_timestamp(),
      case when o.analytics_context->'disabled'='true'::jsonb then 'skipped' else 'pending' end
    from public.initiation_orders o
    where o.id=new.order_id and o.product_type='voyager_initiation'
      and o.status='pending' and o.stripe_session_id is null and o.stripe_payment_intent is null
    on conflict(order_id,event) do nothing;
  end if;
  return new;
end;
$$;

create trigger initiation_shopify_checkout_analytics_after_bind
  after insert or update of checkout_url on public.initiation_shopify_checkouts
  for each row execute function public.queue_initiation_shopify_checkout_analytics();

revoke all on function public.queue_initiation_shopify_checkout_analytics() from public,anon,authenticated;
grant execute on function public.queue_initiation_shopify_checkout_analytics() to service_role;
notify pgrst,'reload schema';
commit;
