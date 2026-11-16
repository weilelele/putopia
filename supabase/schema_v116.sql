-- Shopify fulfillment pilot for a Stripe-paid $38 Initial. Apply before exposing tracking fields.
begin;

alter table public.initiation_orders add column shopify_fulfillment_order_ref text unique;
alter table public.initiation_shipments add column tracking_number text;

create function public.sync_shopify_initial_shipments(
  p_order uuid, p_shopify_ref text, p_packs jsonb
) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  o initiation_orders;
  s initiation_shipments;
  pack jsonb;
  pack_position integer;
  pack_status text;
  tracking text;
  tracking_number_value text;
  changed integer := 0;
  statuses constant text[] := array['planned','preparing','dispatched','delivered'];
begin
  if p_shopify_ref is null or p_shopify_ref !~ '^[a-z0-9-]+\.myshopify\.com/[0-9]+$'
     or jsonb_typeof(p_packs) is distinct from 'object' or p_packs - '1' - '2' <> '{}'::jsonb then
    raise exception 'Invalid Shopify fulfillment snapshot';
  end if;

  perform 1 from initiation_batches where label='S26' for update;
  select * into o from initiation_orders where id=p_order;
  if o.id is null then raise exception 'Initial order not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||o.user_id::text,0));
  select * into o from initiation_orders where id=p_order for update;
  if o.status is distinct from 'paid' or o.order_kind is distinct from 'initial' or o.stripe_livemode is not true
    or (o.shopify_fulfillment_order_ref is not null and o.shopify_fulfillment_order_ref <> p_shopify_ref)
    or public.eligible_initial_initiation_order(o.user_id) is distinct from o.id
    or exists(select 1 from initiation_refund_state where payment_intent=o.stripe_payment_intent and (disputed or refunded_amount>0)) then
    raise exception 'Order is ineligible or already linked to a different Shopify order';
  end if;
  if (select count(*) from initiation_shipments where order_id=o.id and user_id=o.user_id and position in (1,2))<>2 then
    raise exception 'Both existing Initial Pack records are required';
  end if;

  update initiation_orders set shopify_fulfillment_order_ref=p_shopify_ref
    where id=o.id and shopify_fulfillment_order_ref is null;

  for pack_position in 1..2 loop
    pack := p_packs->pack_position::text;
    if pack is null then continue; end if;
    pack_status := pack->>'status';
    tracking := pack->>'trackingUrl';
    tracking_number_value := pack->>'trackingNumber';
    if pack_status is null or pack_status not in ('preparing','dispatched','delivered')
       or (tracking is not null and tracking !~ '^https://[^/[:space:]]+')
       or (tracking_number_value is not null and (length(tracking_number_value)>128 or tracking_number_value !~ '^[[:alnum:] .-]+$'))
       or (pack_status in ('dispatched','delivered') and (tracking is null or tracking_number_value is null)) then
      raise exception 'Invalid Shopify tracking data for Pack %', pack_position;
    end if;
    select * into s from initiation_shipments where order_id=o.id and user_id=o.user_id and position=pack_position for update;
    if s.status in ('dispatched','delivered') and
       ((tracking is not null and tracking is distinct from s.tracking_url) or
        (s.tracking_number is not null and tracking_number_value is not null and tracking_number_value<>s.tracking_number)) then
      raise exception 'Pack % has different dispatched tracking', pack_position;
    end if;
    if array_position(statuses,pack_status)<array_position(statuses,s.status) then continue; end if;
    update initiation_shipments set status=pack_status,
      tracking_url=coalesce(tracking,s.tracking_url), tracking_number=coalesce(tracking_number_value,s.tracking_number)
    where id=s.id and (status,tracking_url,tracking_number) is distinct from
      (pack_status,coalesce(tracking,s.tracking_url),coalesce(tracking_number_value,s.tracking_number));
    if found then changed := changed + 1; end if;
  end loop;

  return changed;
end
$$;
revoke all on function public.sync_shopify_initial_shipments(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.sync_shopify_initial_shipments(uuid,text,jsonb) to service_role;
notify pgrst,'reload schema';

commit;
