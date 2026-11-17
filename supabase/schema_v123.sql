-- Initial and Complete can each have an open Shopify checkout for the same seat.
begin;

alter table public.initiation_shopify_checkouts add column superseded_by uuid
  references public.initiation_shopify_checkouts(order_id)
  check (superseded_by is null or (superseded_by <> order_id and authorization_id is null));

drop index public.initiation_one_pending_order;
create unique index initiation_one_pending_stripe_order on public.initiation_orders(user_id)
  where status = 'pending' and product_id not in ('prod_shopify_initial', 'prod_shopify_standard');
create unique index initiation_one_pending_shopify_bundle on public.initiation_orders(user_id, order_kind)
  where status = 'pending' and product_id in ('prod_shopify_initial', 'prod_shopify_standard');

create function public.reserve_initiation_shopify_v2(
  p_user uuid, p_shop text, p_variant_id text, p_email text, p_kind text, p_device_source text
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; c initiation_shopify_checkouts;
begin
  select * into strict b from initiation_batches where label='S26' for update;
  if not b.checkout_open or not b.stripe_livemode then raise exception 'Live Initiation is closed'; end if;
  if p_kind is null or p_kind not in ('initial','standard')
    or coalesce(p_variant_id,'') !~ '^gid://shopify/ProductVariant/[0-9]+$' then
    raise exception 'Invalid Shopify bundle';
  end if;
  if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human')
    or exists(select 1 from initiation_members where user_id=p_user)
    or exists(select 1 from initiation_entitlements where user_id=p_user)
    or exists(select 1 from initiation_shipments where user_id=p_user)
    or public.eligible_legacy_initiation_order(p_user) is not null then
    raise exception 'This account is not eligible for a new Shopify bundle';
  end if;
  if exists(
    select 1 from initiation_orders existing left join initiation_shopify_checkouts checkout on checkout.order_id=existing.id
    where existing.user_id=p_user and (
      existing.status in ('payment_review','disputed')
      or (existing.status='pending' and (checkout.order_id is null or checkout.authorization_id is not null))
    )
  ) then
    raise exception 'An existing payment must finish reconciliation';
  end if;

  -- The same lock protects expiration, new reservations, and selection of the order to capture.
  update initiation_orders expired set status='canceled'
    from initiation_shopify_checkouts checkout
    where expired.user_id=p_user and expired.status='pending' and expired.expires_at<=now()
      and checkout.order_id=expired.id and checkout.authorization_id is null;

  select existing.* into o from initiation_orders existing join initiation_shopify_checkouts checkout on checkout.order_id=existing.id
    where existing.user_id=p_user and existing.order_kind=p_kind and existing.status='pending';
  if o.id is not null then
    select * into strict c from initiation_shopify_checkouts where order_id=o.id;
    if c.shop<>p_shop or c.variant_id<>p_variant_id or c.email<>lower(trim(p_email)) then
      raise exception 'The existing checkout does not match this offer';
    end if;
    return to_jsonb(o);
  end if;

  -- initiation_occupied_seats counts distinct users. An existing reservation already includes this buyer.
  if public.initiation_occupied_seats()>=b.capacity and not exists(
    select 1 from initiation_orders
      where user_id=p_user and batch=b.label and status in ('pending','paid','payment_review','disputed','refunded')
  ) then
    raise exception 'S26 seats are fully reserved';
  end if;

  insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,device_source,stripe_livemode,pricing_version)
    values(p_user,'price_shopify_'||split_part(p_variant_id,'/',5),'prod_shopify_'||p_kind,p_kind,
      case p_kind when 'initial' then 3800 else 48800 end,p_device_source,b.stripe_livemode,'voyager-bundles-v1')
    returning * into o;
  insert into initiation_shopify_checkouts(order_id,shop,variant_id,email)
    values(o.id,p_shop,p_variant_id,lower(trim(p_email)));
  return to_jsonb(o);
end
$$;

create or replace function public.bind_initiation_shopify_authorization(
  p_reservation uuid, p_shop text, p_order_id text, p_authorization_id text
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare c initiation_shopify_checkouts; o initiation_orders;
begin
  perform 1 from initiation_batches where label='S26' for update;
  select * into strict o from initiation_orders where id=p_reservation for update;
  select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
  if c.shop is distinct from p_shop or p_order_id is null or p_authorization_id is null then
    raise exception 'Authorization does not match the Shopify reservation';
  end if;
  if c.shopify_order_id is not null then
    if c.shopify_order_id<>p_order_id or c.authorization_id<>p_authorization_id or o.status not in ('pending','paid') then
      raise exception 'The Shopify reservation already has a different authorization';
    end if;
    if o.status='paid' or c.capture_attempted_at>now()-interval '1 minute' then return false; end if;
  else
    if o.status<>'pending' or o.expires_at<=now() or o.stripe_session_id is not null or o.stripe_payment_intent is not null
      or exists(select 1 from initiation_members where user_id=o.user_id) then
      raise exception 'This Shopify reservation cannot be captured';
    end if;

    -- Only the first authorized checkout can be captured, including when both webhooks arrive together.
    with superseded as (
      update initiation_shopify_checkouts other set superseded_by=o.id
        from initiation_orders sibling
        where sibling.id=other.order_id and sibling.user_id=o.user_id and sibling.id<>o.id
          and sibling.status='pending' and other.authorization_id is null
        returning other.order_id
    )
    update initiation_orders sibling set status='canceled' from superseded where sibling.id=superseded.order_id;
  end if;
  update initiation_shopify_checkouts set shopify_order_id=p_order_id,authorization_id=p_authorization_id,capture_attempted_at=now() where order_id=o.id;
  return true;
end
$$;

revoke all on function public.reserve_initiation_shopify_v2(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_initiation_shopify_v2(uuid,text,text,text,text,text) to service_role;

notify pgrst,'reload schema';
commit;
