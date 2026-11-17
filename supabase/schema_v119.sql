-- Production Stripe-to-Shopify reconciliation for the two current paid bundles.
-- Requires v116. The isolated Shopify Payments test fixtures in v117/v118 are not prerequisites.
begin;

create table public.initiation_shopify_imports (
  order_id uuid primary key references public.initiation_orders(id) on delete cascade,
  shop text not null check (shop ~ '^[a-z0-9-]+\.myshopify\.com$'),
  reserved_at timestamptz not null default now(),
  shopify_updated_at timestamptz
);

alter table public.initiation_shopify_imports enable row level security;
revoke all on public.initiation_shopify_imports from public, anon, authenticated;
grant select, insert, update on public.initiation_shopify_imports to service_role;

create function public.lock_live_stripe_bundle_for_shopify(p_order uuid)
returns public.initiation_orders
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  buyer uuid;
  o initiation_orders;
  expected_positions integer[];
begin
  select user_id into buyer from initiation_orders where id=p_order;
  if buyer is null then raise exception 'Order not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||buyer::text,0));
  select * into strict o from initiation_orders where id=p_order for update;

  expected_positions:=case
    when o.order_kind='initial' and o.amount=3800 then array[1,2]
    when o.order_kind='standard' and o.amount=48800 then array[1,2,3,4]
  end;
  if expected_positions is null or o.status is distinct from 'paid' or o.stripe_livemode is not true
    or o.currency is distinct from 'usd' or o.paid_at is null or coalesce(o.stripe_payment_intent,'')=''
    or exists(select 1 from initiation_refund_state where payment_intent=o.stripe_payment_intent and (disputed or refunded_amount>0)) then
    raise exception 'Order is not an eligible paid Stripe bundle';
  end if;

  if (select array_agg(position order by position) from initiation_shipments where order_id=o.id and user_id=o.user_id)
       is distinct from expected_positions then
    raise exception 'Order does not have the expected Pack records';
  end if;
  return o;
end
$$;

create function public.reserve_shopify_stripe_order_import(p_order uuid,p_shop text)
returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  o initiation_orders;
begin
  if p_shop is null or p_shop !~ '^[a-z0-9-]+\.myshopify\.com$' then raise exception 'Invalid Shopify shop'; end if;
  select * into o from lock_live_stripe_bundle_for_shopify(p_order);
  if o.shopify_fulfillment_order_ref is not null
    or exists(select 1 from initiation_shipments where order_id=o.id
      and (status not in ('planned','preparing') or tracking_url is not null or tracking_number is not null)) then
    raise exception 'This import requires an unlinked order with no previous fulfillment';
  end if;
  insert into initiation_shopify_imports(order_id,shop) values (o.id,p_shop) on conflict(order_id) do nothing;
  return found;
end
$$;

create function public.sync_shopify_stripe_bundle_shipments(
  p_order uuid,p_shopify_ref text,p_shopify_updated_at timestamptz,p_packs jsonb
) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  o initiation_orders;
  ledger initiation_shopify_imports;
  shipment initiation_shipments;
  item record;
  last_status text;
  link text;
  number text;
  updated integer;
  changed integer:=0;
  statuses constant text[]:=array['planned','preparing','dispatched','delivered'];
  pack_count integer;
begin
  if p_shopify_ref is null or p_shopify_ref !~ '^[a-z0-9-]+\.myshopify\.com/[0-9]+$'
    or p_shopify_updated_at is null or jsonb_typeof(p_packs) is distinct from 'object' then
    raise exception 'Invalid Shopify snapshot';
  end if;
  select * into o from lock_live_stripe_bundle_for_shopify(p_order);
  select * into ledger from initiation_shopify_imports where order_id=o.id for update;
  if not found or ledger.shop<>split_part(p_shopify_ref,'/',1)
    or (o.shopify_fulfillment_order_ref is not null and o.shopify_fulfillment_order_ref<>p_shopify_ref) then
    raise exception 'Order was not reserved for this Shopify order';
  end if;
  if ledger.shopify_updated_at>p_shopify_updated_at then return 0; end if;

  pack_count:=case o.order_kind when 'initial' then 2 else 4 end;
  update initiation_orders set shopify_fulfillment_order_ref=p_shopify_ref
    where id=o.id and shopify_fulfillment_order_ref is null;
  for item in select key,value from jsonb_each(p_packs) loop
    if item.key !~ '^[1-4]$' or item.key::integer>pack_count then raise exception 'Unexpected Shopify Pack position'; end if;
    last_status:=item.value->>'status';
    link:=item.value->>'trackingUrl';
    number:=item.value->>'trackingNumber';
    if last_status is null or last_status not in ('preparing','dispatched','delivered')
      or (link is not null and link !~ '^https://[^/[:space:]]+')
      or (number is not null and number !~ '^[A-Za-z0-9 .-]{1,128}$')
      or (last_status in ('dispatched','delivered') and (link is null or number is null)) then
      raise exception 'Invalid Shopify tracking information';
    end if;
    select * into strict shipment from initiation_shipments where order_id=o.id and position=item.key::integer for update;
    if shipment.status='canceled' then raise exception 'A canceled Pack cannot be fulfilled'; end if;
    if shipment.status in ('dispatched','delivered') and
      ((link is not null and shipment.tracking_url is not null and link<>shipment.tracking_url)
      or (number is not null and shipment.tracking_number is not null and number<>shipment.tracking_number)) then
      raise exception 'Pack tracking changed after dispatch';
    end if;
    if array_position(statuses,last_status)<array_position(statuses,shipment.status) then continue; end if;
    update initiation_shipments set status=last_status,tracking_url=coalesce(link,shipment.tracking_url),
      tracking_number=coalesce(number,shipment.tracking_number)
      where id=shipment.id and (status,tracking_url,tracking_number) is distinct from
        (last_status,coalesce(link,shipment.tracking_url),coalesce(number,shipment.tracking_number));
    get diagnostics updated=row_count;
    changed:=changed+updated;
  end loop;
  update initiation_shopify_imports set shopify_updated_at=p_shopify_updated_at where order_id=o.id;
  return changed;
end
$$;

revoke all on function public.lock_live_stripe_bundle_for_shopify(uuid),
  public.reserve_shopify_stripe_order_import(uuid,text),
  public.sync_shopify_stripe_bundle_shipments(uuid,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.lock_live_stripe_bundle_for_shopify(uuid),
  public.reserve_shopify_stripe_order_import(uuid,text),
  public.sync_shopify_stripe_bundle_shipments(uuid,text,timestamptz,jsonb) to service_role;

commit;
