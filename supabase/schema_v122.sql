-- Production Shopify Payment reservations. Applying this migration does not change the checkout provider.
begin;

create table public.initiation_shopify_checkouts (
  order_id uuid primary key references public.initiation_orders(id),
  shop text not null check (shop ~ '^[a-z0-9-]+\.myshopify\.com$'),
  variant_id text not null check (variant_id ~ '^gid://shopify/ProductVariant/[0-9]+$'),
  email text not null check (email=lower(trim(email)) and length(email) between 3 and 254),
  checkout_url text check (checkout_url ~ '^https://[a-z0-9-]+\.myshopify\.com/'),
  shopify_order_id text unique check (shopify_order_id ~ '^gid://shopify/Order/[0-9]+$'),
  authorization_id text unique check (authorization_id ~ '^gid://shopify/OrderTransaction/[0-9]+$'),
  capture_attempted_at timestamptz,
  capture_id text unique check (capture_id ~ '^gid://shopify/OrderTransaction/[0-9]+$'),
  last_shipping_update timestamptz,
  check ((shopify_order_id is null)=(authorization_id is null)),
  check (capture_id is null or authorization_id is not null)
);
alter table public.initiation_shopify_checkouts enable row level security;
revoke all on public.initiation_shopify_checkouts from public,anon,authenticated;
grant select,insert,update on public.initiation_shopify_checkouts to service_role;

create table public.initiation_shopify_events (
  shop text not null,
  order_gid text not null check (order_gid ~ '^gid://shopify/Order/[0-9]+$'),
  event_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (shop,order_gid)
);
alter table public.initiation_shopify_events enable row level security;
revoke all on public.initiation_shopify_events from public,anon,authenticated;
grant select,insert,update,delete on public.initiation_shopify_events to service_role;

create function public.reserve_initiation_shopify(
  p_user uuid,p_shop text,p_variant_id text,p_email text,p_kind text,p_device_source text
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; c initiation_shopify_checkouts; quote jsonb;
begin
  select * into strict b from initiation_batches where label='S26' for update;
  if not b.checkout_open or not b.stripe_livemode then raise exception 'Live Initiation is closed'; end if;
  if p_kind is null or p_kind not in ('initial','standard')
    or coalesce(p_variant_id,'') !~ '^gid://shopify/ProductVariant/[0-9]+$' then
    raise exception 'Invalid Shopify bundle';
  end if;

  select * into o from initiation_orders where user_id=p_user and status='pending' for update;
  if o.id is not null then
    select * into c from initiation_shopify_checkouts where order_id=o.id for update;
    if c.order_id is null or c.shop<>p_shop or c.variant_id<>p_variant_id
      or c.email<>lower(trim(p_email)) or o.order_kind<>p_kind or o.expires_at<=now()
      or c.shopify_order_id is not null then
      raise exception 'An existing checkout must finish or expire';
    end if;
    return to_jsonb(o);
  end if;

  quote:=public.reserve_initiation_v2(p_user,'price_shopify_'||split_part(p_variant_id,'/',5),
    'prod_shopify_'||p_kind,p_kind,p_device_source);
  insert into initiation_shopify_checkouts(order_id,shop,variant_id,email)
    values((quote->>'id')::uuid,p_shop,p_variant_id,lower(trim(p_email)));
  return quote;
end
$$;

create function public.bind_initiation_shopify_authorization(
  p_reservation uuid,p_shop text,p_order_id text,p_authorization_id text
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
  elsif o.status<>'pending' or o.expires_at<=now() or o.stripe_session_id is not null or o.stripe_payment_intent is not null then
    raise exception 'This Shopify reservation cannot be captured';
  end if;
  update initiation_shopify_checkouts set shopify_order_id=p_order_id,authorization_id=p_authorization_id,capture_attempted_at=now() where order_id=o.id;
  return true;
end
$$;

create function public.confirm_initiation_shopify_capture(
  p_reservation uuid,p_shop text,p_order_id text,p_authorization_id text,p_capture_id text,
  p_paid_at timestamptz,p_shipping jsonb
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare c initiation_shopify_checkouts; o initiation_orders; included integer;
begin
  perform 1 from initiation_batches where label='S26' for update;
  select * into strict o from initiation_orders where id=p_reservation for update;
  select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
  if c.shop is distinct from p_shop or c.shopify_order_id is null
    or c.shopify_order_id is distinct from p_order_id or c.authorization_id is distinct from p_authorization_id
    or p_capture_id is null or p_paid_at is null then
    raise exception 'Shopify capture does not match the approved authorization';
  end if;
  if c.capture_id=p_capture_id and o.status='paid' then return o.id; end if;
  if o.status<>'pending' or c.capture_id is not null or not exists(
      select 1 from voyager_profiles where id=o.user_id and account_kind='human'
    ) or exists(select 1 from initiation_members where user_id=o.user_id) then
    raise exception 'Shopify capture needs account reconciliation';
  end if;
  if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')=''
    or p_shipping->'address'->>'country' is distinct from 'US' then
    raise exception 'Shopify capture requires a verified address';
  end if;
  included:=case o.order_kind when 'initial' then 2 when 'standard' then 4 end;
  if included is null then raise exception 'Unsupported Shopify capture'; end if;
  update initiation_shopify_checkouts set capture_id=p_capture_id where order_id=o.id;
  update initiation_orders set status='paid',paid_at=p_paid_at,shipping=p_shipping,
    shopify_fulfillment_order_ref=p_shop||'/'||split_part(p_order_id,'/',5) where id=o.id;
  insert into initiation_members(user_id,batch,source,order_id) values(o.user_id,o.batch,'paid',o.id);
  if included=4 then insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id); end if;
  insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
    select o.user_id,o.id,n,'Initiation Pack '||n,month
    from (values (1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) schedule(n,month) where n<=included;
  update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
    member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
    member_since=coalesce(member_since,p_paid_at),batch_label='S26' where id=o.user_id;
  return o.id;
end
$$;

create or replace function public.eligible_initial_initiation_order(p_user uuid)
returns uuid language sql stable security invoker set search_path=public as $$
  select o.id from initiation_orders o join voyager_profiles p on p.id=o.user_id
  join initiation_members m on m.user_id=o.user_id
  where o.user_id=p_user and p.account_kind='human' and o.order_kind='initial'
  and o.pricing_version='voyager-bundles-v1' and o.amount=3800 and o.currency='usd'
  and o.status='paid' and o.paid_at is not null
  and ((o.stripe_payment_intent is not null
    and not exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent))
    or exists(select 1 from initiation_shopify_checkouts c where c.order_id=o.id and c.capture_id is not null))
  order by o.paid_at,o.id limit 1;
$$;

create function public.sync_initiation_shopify_checkout_packs(
  p_reservation uuid,p_capture text,p_updated_at timestamptz,p_packs jsonb
) returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare c initiation_shopify_checkouts; o initiation_orders; pack record;
  count_changed integer:=0; changes integer; next_status text; link text; tracking text;
  stages constant text[]:=array['planned','preparing','dispatched','delivered'];
begin
  select * into strict o from initiation_orders where id=p_reservation for update;
  select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
  if o.status<>'paid' or c.capture_id is null or c.capture_id is distinct from p_capture
    or p_updated_at is null or jsonb_typeof(p_packs) is distinct from 'object' then
    raise exception 'Shipment update does not match a paid Shopify order';
  end if;
  if c.last_shipping_update>p_updated_at then return 0; end if;
  for pack in select key,value from jsonb_each(p_packs) loop
    next_status:=pack.value->>'status';
    link:=pack.value->>'trackingUrl';
    tracking:=pack.value->>'trackingNumber';
    if pack.key !~ '^[1-4]$' or next_status is null or not (next_status=any(stages))
      or (link is not null and link !~ '^https://[^/[:space:]]+')
      or (tracking is not null and tracking !~ '^[A-Za-z0-9 .-]{1,128}$')
      or (next_status in ('dispatched','delivered') and (link is null or tracking is null))
      or not exists(select 1 from initiation_shipments where order_id=o.id and position=pack.key::integer) then
      raise exception 'Invalid Shopify Pack update';
    end if;
    update initiation_shipments s set status=next_status,tracking_url=coalesce(link,s.tracking_url),
      tracking_number=coalesce(tracking,s.tracking_number)
    where s.order_id=o.id and s.position=pack.key::integer
      and array_position(stages,next_status)>=array_position(stages,s.status)
      and (s.status not in ('dispatched','delivered') or
        ((tracking is null or s.tracking_number is null or tracking=s.tracking_number)
          and (link is null or s.tracking_url is null or link=s.tracking_url)))
      and (s.status,s.tracking_url,s.tracking_number) is distinct from
        (next_status,coalesce(link,s.tracking_url),coalesce(tracking,s.tracking_number));
    get diagnostics changes=row_count;
    count_changed:=count_changed+changes;
  end loop;
  update initiation_shopify_checkouts set last_shipping_update=p_updated_at where order_id=o.id;
  return count_changed;
end
$$;

create function public.expire_unbound_initiation_shopify_checkouts()
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare changed integer;
begin
  perform 1 from initiation_batches where label='S26' for update;
  update initiation_orders o set status='canceled' from initiation_shopify_checkouts c
    where c.order_id=o.id and c.shopify_order_id is null and o.status='pending' and o.expires_at<=now();
  get diagnostics changed=row_count;
  return changed;
end
$$;

revoke all on function public.reserve_initiation_shopify(uuid,text,text,text,text,text),
  public.bind_initiation_shopify_authorization(uuid,text,text,text),
  public.confirm_initiation_shopify_capture(uuid,text,text,text,text,timestamptz,jsonb),
  public.sync_initiation_shopify_checkout_packs(uuid,text,timestamptz,jsonb),
  public.expire_unbound_initiation_shopify_checkouts() from public,anon,authenticated;
grant execute on function public.reserve_initiation_shopify(uuid,text,text,text,text,text),
  public.bind_initiation_shopify_authorization(uuid,text,text,text),
  public.confirm_initiation_shopify_capture(uuid,text,text,text,text,timestamptz,jsonb),
  public.sync_initiation_shopify_checkout_packs(uuid,text,timestamptz,jsonb),
  public.expire_unbound_initiation_shopify_checkouts() to service_role;
notify pgrst,'reload schema';
commit;
