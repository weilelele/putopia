-- Local Shopify Initial pilot. Requires v116. Apply only to a disposable database with Stripe checkout closed.
begin;

create table public.initiation_shopify_pilot_orders (
  shop text not null,
  shopify_order_id text not null,
  order_id uuid not null unique references public.initiation_orders(id) on delete cascade,
  shopify_updated_at timestamptz not null,
  refunded_packs integer[] not null default '{}',
  primary key (shop,shopify_order_id)
);
alter table public.initiation_shopify_pilot_orders enable row level security;
revoke all on public.initiation_shopify_pilot_orders from public,anon,authenticated;
grant select,insert,update on public.initiation_shopify_pilot_orders to service_role;
grant usage on sequence public.voyager_member_no_seq to service_role;

alter table public.initiation_shipments drop constraint initiation_shipments_status_check;
alter table public.initiation_shipments add constraint initiation_shipments_status_check
  check(status in ('planned','preparing','dispatched','delivered','canceled'));

-- Retain the existing Stripe eligibility path and add a separate test receipt binding.
create or replace function public.eligible_initial_initiation_order(p_user uuid) returns uuid
language sql stable security invoker set search_path=public,pg_temp as $$
  select o.id from initiation_orders o join voyager_profiles p on p.id=o.user_id
  join initiation_members m on m.user_id=o.user_id
  where o.user_id=p_user and p.account_kind='human' and o.order_kind='initial'
    and o.pricing_version='voyager-bundles-v1' and o.amount=3800 and o.currency='usd'
    and o.status='paid' and o.paid_at is not null
    and (
      (o.stripe_payment_intent is not null and not exists(
        select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent
      )) or (
        not o.stripe_livemode and m.active and m.order_id=o.id and exists(
          select 1 from initiation_shopify_pilot_orders s where s.order_id=o.id
        ) and exists(select 1 from initiation_batches b where b.label=o.batch and not b.stripe_livemode and not b.checkout_open)
      )
    )
  order by o.paid_at,o.id limit 1;
$$;

create function public.sync_shopify_initial_pilot(
  p_shop text,p_shopify_order text,p_user uuid,p_paid_at timestamptz,
  p_updated_at timestamptz,p_refunded_packs integer[],p_packs jsonb
) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  b initiation_batches;
  binding initiation_shopify_pilot_orders;
  receipt uuid;
  pack jsonb;
  pack_position integer;
  next_status text;
  tracking text;
  tracking_number_value text;
  statuses constant text[] := array['planned','preparing','dispatched','delivered'];
begin
  select * into b from initiation_batches where label='S26' for update;
  if b.label is null or b.stripe_livemode or b.checkout_open then
    raise exception 'A closed test-mode S26 batch is required';
  end if;
  if p_shop is null or p_shop !~ '^[a-z0-9-]+\.myshopify\.com$'
    or p_shopify_order is null or p_shopify_order !~ '^gid://shopify/Order/[0-9]+$'
    or p_paid_at is null or p_updated_at is null
    or p_refunded_packs is null or not (p_refunded_packs <@ array[1,2])
    or cardinality(p_refunded_packs) <> (select count(distinct n) from unnest(p_refunded_packs) n)
    or jsonb_typeof(p_packs) is distinct from 'object'
    or not (p_packs ?& array['1','2']) then
    raise exception 'Invalid Shopify pilot snapshot';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
  select * into binding from initiation_shopify_pilot_orders
    where shop=p_shop and shopify_order_id=p_shopify_order for update;
  if binding.order_id is null then
    if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human' and role='applicant')
      or exists(select 1 from initiation_members where user_id=p_user)
      or exists(select 1 from initiation_orders where user_id=p_user)
      or exists(select 1 from initiation_shipments where user_id=p_user)
      or exists(select 1 from initiation_entitlements where user_id=p_user)
      or exists(select 1 from voyager_orders where user_id=p_user)
      or public.initiation_occupied_seats()>=b.capacity then
      raise exception 'Use a fresh test account with an available S26 seat';
    end if;

    insert into initiation_orders (
      user_id,price_id,product_id,order_kind,amount,status,stripe_livemode,pricing_version,paid_at,analytics_context
    ) values (
      p_user,'shopify-initial-pilot-usd3800','shopify-initial-pilot','initial',3800,
      case when cardinality(p_refunded_packs)=2 then 'refunded' else 'paid' end,
      false,'voyager-bundles-v1',p_paid_at,'{"disabled":true}'
    ) returning id into receipt;
    insert into initiation_shopify_pilot_orders (shop,shopify_order_id,order_id,shopify_updated_at)
      values(p_shop,p_shopify_order,receipt,p_updated_at) returning * into binding;
    insert into initiation_members(user_id,source,order_id,active)
      values(p_user,'paid',receipt,cardinality(p_refunded_packs)<2);
    insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
      select p_user,receipt,n,'Initiation Pack '||n,to_char(p_paid_at at time zone 'UTC','YYYY-MM')
      from generate_series(1,2) n;
  else
    receipt:=binding.order_id;
    if not exists(select 1 from initiation_orders where id=receipt and user_id=p_user and not stripe_livemode) then
      raise exception 'Shopify pilot order belongs to another account';
    end if;
    if p_updated_at < binding.shopify_updated_at then
      return jsonb_build_object('order_id',receipt,'result','older_snapshot_ignored');
    end if;
    if not (binding.refunded_packs <@ p_refunded_packs) then
      raise exception 'A confirmed pack refund cannot be reversed';
    end if;
  end if;

  for pack_position in 1..2 loop
    pack:=p_packs->pack_position::text;
    next_status:=pack->>'status';
    tracking:=pack->>'trackingUrl';
    tracking_number_value:=pack->>'trackingNumber';
    if next_status is null or not(next_status=any(statuses))
      or (tracking is not null and tracking !~ '^https://[^/[:space:]]+')
      or (tracking_number_value is not null and (length(tracking_number_value)>128 or tracking_number_value !~ '^[A-Za-z0-9 .-]+$'))
      or (next_status in ('dispatched','delivered') and (tracking is null or tracking_number_value is null)) then
      raise exception 'Invalid Shopify pilot shipment';
    end if;
    update initiation_shipments s set
      status=case
        when s.status='canceled' then s.status
        when pack_position=any(p_refunded_packs)
          and s.status in ('planned','preparing') and next_status in ('planned','preparing') then 'canceled'
        when s.status in ('planned','preparing') then next_status
        when array_position(statuses,next_status)>array_position(statuses,s.status) then next_status
        else s.status
      end,
      tracking_url=case
        when s.status in ('canceled','dispatched','delivered') then s.tracking_url
        when pack_position=any(p_refunded_packs) and next_status in ('planned','preparing') then null
        else tracking
      end,
      tracking_number=case
        when s.status in ('canceled','dispatched','delivered') then s.tracking_number
        when pack_position=any(p_refunded_packs) and next_status in ('planned','preparing') then null
        else tracking_number_value
      end
    where s.order_id=receipt and s.position=pack_position;
  end loop;

  update initiation_shopify_pilot_orders set shopify_updated_at=p_updated_at,refunded_packs=p_refunded_packs
    where order_id=receipt;
  if cardinality(p_refunded_packs)=2 then
    update initiation_orders set status='refunded' where id=receipt and status='paid';
    update initiation_members set active=false where order_id=receipt and active;
    update voyager_profiles set role='applicant',member_source=null,batch_label=null
      where id=p_user and role='voyager' and member_source='paid';
  else
    update voyager_profiles set role='voyager',member_source='paid',batch_label='S26',
      member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
      member_since=coalesce(member_since,p_paid_at)
      where id=p_user and role='applicant';
  end if;

  return jsonb_build_object('order_id',receipt,'result','synced','refunded_packs',p_refunded_packs);
end
$$;
revoke all on function public.sync_shopify_initial_pilot(text,text,uuid,timestamptz,timestamptz,integer[],jsonb)
  from public,anon,authenticated;
grant execute on function public.sync_shopify_initial_pilot(text,text,uuid,timestamptz,timestamptz,integer[],jsonb)
  to service_role;
notify pgrst,'reload schema';

commit;
