-- S26 $12 Membership, server-priced Shopify upgrades and monotonic refunds.
-- Apply before enabling INITIATION_MEMBERSHIP_ENABLED. Historical receipts retain their prices.
begin;
alter table public.initiation_shipments drop constraint initiation_shipments_status_check;
alter table public.initiation_shipments add constraint initiation_shipments_status_check check(status in ('planned','preparing','dispatched','delivered','canceled'));
alter table public.initiation_orders add column membership_order_id uuid references public.initiation_orders(id);
alter table public.initiation_orders drop constraint initiation_order_offer_check;
alter table public.initiation_orders add constraint initiation_order_offer_check check (coalesce((
 (pricing_version is null and initial_order_id is null and membership_order_id is null and
  ((order_kind='standard' and amount=52000 and legacy_order_id is null) or
   (order_kind='legacy_upgrade' and amount=40000 and legacy_order_id is not null))) or
 (pricing_version='voyager-bundles-v1' and
  ((order_kind='initial' and amount=3800 and legacy_order_id is null and initial_order_id is null and membership_order_id is null) or
   (order_kind='standard' and amount=48800 and legacy_order_id is null and initial_order_id is null and membership_order_id is null) or
   (order_kind='legacy_upgrade' and amount=46000 and num_nonnulls(legacy_order_id,initial_order_id)=1))) or
 (pricing_version='voyager-membership-v1' and legacy_order_id is null and initial_order_id is null and
  ((order_kind='membership' and amount=1200 and membership_order_id is null) or
   (order_kind='initial' and amount=2600 and membership_order_id is not null) or
   (order_kind='standard' and amount=47600 and membership_order_id is not null)))
),false));
drop index public.initiation_one_complete_order;
create unique index initiation_one_complete_order on public.initiation_orders(user_id)
 where order_kind in ('standard','legacy_upgrade') and status in ('paid','payment_review','disputed');
create unique index initiation_one_membership_order on public.initiation_orders(user_id)
 where order_kind='membership' and status in ('paid','payment_review','disputed');
drop index public.initiation_one_pending_stripe_order;
drop index public.initiation_one_pending_shopify_bundle;
create unique index initiation_one_pending_stripe_order on public.initiation_orders(user_id)
 where status='pending' and product_id not like 'prod_shopify_%';
create unique index initiation_one_pending_shopify_bundle on public.initiation_orders(user_id,order_kind)
 where status='pending' and product_id like 'prod_shopify_%';
alter table public.initiation_shopify_checkouts
 add column reference_version smallint not null default 1 check(reference_version in (1,2)),
 add column refunded_amount integer not null default 0 check(refunded_amount>=0),
 add column refunded_packs integer[] not null default '{}',
 add column refund_review boolean not null default false,
 add column canceled_at timestamptz,
 add column last_financial_update timestamptz;

create or replace function public.guard_initiation_quote() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if row(new.user_id,new.order_kind,new.amount,new.currency,new.price_id,new.product_id,new.stripe_livemode,new.pricing_version,new.legacy_order_id,new.initial_order_id,new.membership_order_id)
 is distinct from row(old.user_id,old.order_kind,old.amount,old.currency,old.price_id,old.product_id,old.stripe_livemode,old.pricing_version,old.legacy_order_id,old.initial_order_id,old.membership_order_id)
 then raise exception 'Saved purchase quotes are immutable'; end if;
 return new;
end $$;

create function public.eligible_voyager_membership_order(p_user uuid) returns uuid
language sql stable security invoker set search_path=public,pg_temp as $$
 select o.id from initiation_orders o
 join initiation_shopify_checkouts c on c.order_id=o.id
 join initiation_members m on m.user_id=o.user_id and m.source='paid' and m.active
 join voyager_profiles p on p.id=o.user_id and p.account_kind='human'
 where o.user_id=p_user and o.order_kind='membership' and o.amount=1200 and o.currency='usd'
  and o.pricing_version='voyager-membership-v1' and o.status='paid' and o.paid_at is not null
  and c.capture_id is not null and c.refunded_amount=0 and c.canceled_at is null
 order by o.paid_at,o.id limit 1;
$$;

create or replace function public.eligible_initial_initiation_order(p_user uuid) returns uuid
language sql stable security invoker set search_path=public,pg_temp as $$
 select o.id from initiation_orders o
 join voyager_profiles p on p.id=o.user_id and p.account_kind='human'
 join initiation_members m on m.user_id=o.user_id and m.active
 left join initiation_shopify_checkouts c on c.order_id=o.id
 where o.user_id=p_user and o.order_kind='initial' and o.currency='usd' and o.status='paid' and o.paid_at is not null
 and ((o.pricing_version='voyager-bundles-v1' and o.amount=3800 and o.membership_order_id is null) or
   (o.pricing_version='voyager-membership-v1' and o.amount=2600 and o.membership_order_id=public.eligible_voyager_membership_order(p_user)))
 and ((o.stripe_payment_intent is not null and not exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent))
  or (c.capture_id is not null and c.refunded_amount=0 and c.canceled_at is null))
 order by o.paid_at,o.id limit 1;
$$;

create or replace function public.initiation_occupied_seats() returns bigint
language sql stable security invoker set search_path=public,pg_temp as $$
 select count(*) from (
  select m.user_id from initiation_members m left join initiation_orders o on o.id=m.order_id
   where m.batch='S26' and (m.active or (o.pricing_version is distinct from 'voyager-membership-v1' and o.membership_order_id is null
    and not exists(select 1 from initiation_shopify_checkouts c where c.order_id=o.id and c.reference_version=2 and (c.refunded_amount>=o.amount or c.canceled_at is not null))))
  union
  select o.user_id from initiation_orders o where o.batch='S26' and (
   (o.pricing_version is distinct from 'voyager-membership-v1' and o.membership_order_id is null
    and o.status in ('pending','paid','payment_review','disputed','refunded')
    and not exists(select 1 from initiation_shopify_checkouts c where c.order_id=o.id and c.reference_version=2 and (c.refunded_amount>=o.amount or c.canceled_at is not null))) or
   (o.order_kind='membership' and ((o.status='pending' and o.expires_at>now()) or
    (o.status='paid' and exists(select 1 from initiation_shopify_checkouts c where c.order_id=o.id and c.refunded_amount=0 and c.canceled_at is null)))) or
   (o.membership_order_id is not null and o.membership_order_id=public.eligible_voyager_membership_order(o.user_id)
    and o.status in ('pending','paid','payment_review','disputed'))
  )
 ) seats;
$$;

create function public.reserve_initiation_shopify_v3(
 p_user uuid,p_shop text,p_variant_id text,p_email text,p_target text,p_device_source text
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; c initiation_shopify_checkouts;
 root uuid; initial_id uuid; legacy_id uuid; kind text; total integer; version text;
begin
 select * into strict b from initiation_batches where label='S26' for update;
 if not b.checkout_open or not b.stripe_livemode then raise exception 'Live Initiation is closed'; end if;
 if p_target is null or p_target not in ('membership','initial','standard') or coalesce(p_variant_id,'') !~ '^gid://shopify/ProductVariant/[0-9]+$'
  or coalesce(p_shop,'') !~ '^[a-z0-9-]+\.myshopify\.com$' or coalesce(trim(p_email),'')='' then raise exception 'Invalid Shopify offer'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'Only human accounts may start a payment'; end if;
 if exists(select 1 from initiation_entitlements where user_id=p_user and (active or console_claimed_at is not null)) then raise exception 'Existing Console entitlement requires reconciliation'; end if;
 if exists(select 1 from initiation_members where user_id=p_user and active and source='granted') then raise exception 'Existing granted membership requires reconciliation'; end if;
 root:=public.eligible_voyager_membership_order(p_user);
 initial_id:=public.eligible_initial_initiation_order(p_user);
 legacy_id:=public.eligible_legacy_initiation_order(p_user);
 kind:=p_target;
 version:='voyager-bundles-v1';
 if initial_id is not null or legacy_id is not null then
  if p_target<>'standard' then raise exception 'Initial Pack is already owned'; end if;
  kind:='legacy_upgrade'; total:=46000;
 elsif root is not null then
  if p_target='membership' then raise exception 'Membership is already active'; end if;
  total:=case p_target when 'initial' then 2600 else 47600 end;
  version:='voyager-membership-v1';
 else
  if exists(select 1 from initiation_members where user_id=p_user and active) then raise exception 'Existing membership requires reconciliation'; end if;
  total:=case p_target when 'membership' then 1200 when 'initial' then 3800 else 48800 end;
  if p_target='membership' then version:='voyager-membership-v1'; end if;
 end if;
 if exists(select 1 from initiation_orders x left join initiation_shopify_checkouts y on y.order_id=x.id
  where x.user_id=p_user and (x.status in ('payment_review','disputed') or
   (x.status='pending' and (y.order_id is null or y.authorization_id is not null)) or
   (x.status='paid' and coalesce(y.refunded_amount,0)>0))) then raise exception 'An existing payment must finish reconciliation'; end if;
 if initial_id is null and legacy_id is null and exists(select 1 from initiation_shipments where user_id=p_user and status<>'canceled') then
  raise exception 'Existing Pack fulfillment requires reconciliation'; end if;
 update initiation_orders x set status='canceled' from initiation_shopify_checkouts y
  where x.user_id=p_user and x.status='pending' and x.expires_at<=now() and y.order_id=x.id and y.authorization_id is null;
 select x.* into o from initiation_orders x where x.user_id=p_user and x.order_kind=kind and x.status='pending' for update;
 if o.id is not null then
  select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
  if c.shop<>p_shop or c.variant_id<>p_variant_id or c.email<>lower(trim(p_email)) or o.amount<>total
   or o.membership_order_id is distinct from root or o.initial_order_id is distinct from initial_id then raise exception 'The existing checkout does not match this offer'; end if;
  return to_jsonb(o);
 end if;
 if public.initiation_occupied_seats()>=b.capacity and root is null and initial_id is null and legacy_id is null
  and not exists(select 1 from initiation_orders where user_id=p_user and status='pending' and expires_at>now()) then raise exception 'S26 seats are fully reserved'; end if;
 insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,device_source,stripe_livemode,pricing_version,membership_order_id,initial_order_id,legacy_order_id)
 values(p_user,'price_shopify_'||split_part(p_variant_id,'/',5),'prod_shopify_'||kind,kind,total,p_device_source,true,version,
  root,initial_id,case when initial_id is null then legacy_id end) returning * into o;
 insert into initiation_shopify_checkouts(order_id,shop,variant_id,email,reference_version) values(o.id,p_shop,p_variant_id,lower(trim(p_email)),2);
 return to_jsonb(o);
end $$;

create or replace function public.bind_initiation_shopify_authorization(p_reservation uuid,p_shop text,p_order_id text,p_authorization_id text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; c initiation_shopify_checkouts;
begin
 perform 1 from initiation_batches where label='S26' for update;
 select * into strict o from initiation_orders where id=p_reservation for update;
 select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
 if c.shop is distinct from p_shop or p_order_id is null or p_authorization_id is null then raise exception 'Authorization does not match the Shopify reservation'; end if;
 if c.shopify_order_id is not null then
  if c.shopify_order_id<>p_order_id or c.authorization_id<>p_authorization_id or o.status not in ('pending','paid') then raise exception 'The Shopify reservation already has a different authorization'; end if;
  if o.status='paid' or c.capture_attempted_at>now()-interval '1 minute' then return false; end if;
 else
  if o.status<>'pending' or o.expires_at<=now() or o.stripe_session_id is not null or o.stripe_payment_intent is not null
   or c.superseded_by is not null then raise exception 'This Shopify reservation cannot be captured'; end if;
  if o.membership_order_id is not null and o.membership_order_id is distinct from public.eligible_voyager_membership_order(o.user_id) then raise exception 'Membership credit is no longer available'; end if;
  if o.order_kind='legacy_upgrade' and ((o.initial_order_id is not null and o.initial_order_id is distinct from public.eligible_initial_initiation_order(o.user_id)) or
   (o.legacy_order_id is not null and o.legacy_order_id is distinct from public.eligible_legacy_initiation_order(o.user_id))) then raise exception 'Initial Pack qualification changed'; end if;
  if o.order_kind in ('membership','initial','standard') and o.membership_order_id is null and exists(select 1 from initiation_members where user_id=o.user_id and active) then raise exception 'An active membership already exists'; end if;
  with superseded as (
   update initiation_shopify_checkouts other set superseded_by=o.id from initiation_orders sibling
    where sibling.id=other.order_id and sibling.user_id=o.user_id and sibling.id<>o.id and sibling.status='pending' and other.authorization_id is null
   returning other.order_id
  ) update initiation_orders sibling set status='canceled' from superseded where sibling.id=superseded.order_id;
 end if;
 update initiation_shopify_checkouts set shopify_order_id=p_order_id,authorization_id=p_authorization_id,capture_attempted_at=now() where order_id=o.id;
 return true;
end $$;

alter function public.confirm_initiation_shopify_capture(uuid,text,text,text,text,timestamptz,jsonb) rename to confirm_initiation_shopify_capture_pre_membership;
create function public.confirm_initiation_shopify_capture(p_reservation uuid,p_shop text,p_order_id text,p_authorization_id text,p_capture_id text,p_paid_at timestamptz,p_shipping jsonb)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; c initiation_shopify_checkouts; positions integer[];
begin
 perform 1 from initiation_batches where label='S26' for update;
 select * into strict o from initiation_orders where id=p_reservation for update;
 select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
 if c.shop is distinct from p_shop or c.shopify_order_id is distinct from p_order_id or c.authorization_id is distinct from p_authorization_id
  or c.authorization_id is null or p_capture_id is null or p_paid_at is null then raise exception 'Shopify capture does not match the approved authorization'; end if;
 if c.refunded_amount>0 or c.canceled_at is not null then raise exception 'This payment was reversed'; end if;
 if c.capture_id=p_capture_id and o.status='paid' then return o.id; end if;
 if c.reference_version=1 and o.order_kind not in ('membership','legacy_upgrade') and o.membership_order_id is null then
  return public.confirm_initiation_shopify_capture_pre_membership(p_reservation,p_shop,p_order_id,p_authorization_id,p_capture_id,p_paid_at,p_shipping);
 end if;
 if o.status<>'pending' or c.capture_id is not null or not exists(select 1 from voyager_profiles where id=o.user_id and account_kind='human') then raise exception 'Shopify capture needs account reconciliation'; end if;
 if o.membership_order_id is not null and o.membership_order_id is distinct from public.eligible_voyager_membership_order(o.user_id) then raise exception 'Membership credit is no longer available'; end if;
 if o.initial_order_id is not null and o.initial_order_id is distinct from public.eligible_initial_initiation_order(o.user_id) then raise exception 'Initial Pack qualification changed'; end if;
 if o.legacy_order_id is not null and o.legacy_order_id is distinct from public.eligible_legacy_initiation_order(o.user_id) then raise exception 'Historical Initial Pack qualification changed'; end if;
 if o.order_kind<>'membership' and (coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')='' or p_shipping->'address'->>'country' is distinct from 'US') then raise exception 'A verified delivery address is required'; end if;
 update initiation_shopify_checkouts set capture_id=p_capture_id where order_id=o.id;
 update initiation_orders set status='paid',paid_at=p_paid_at,shipping=p_shipping,
  shopify_fulfillment_order_ref=p_shop||'/'||split_part(p_order_id,'/',5) where id=o.id;
 if o.order_kind='membership' or (o.membership_order_id is null and o.order_kind in ('initial','standard')) then
  insert into initiation_members(user_id,batch,source,order_id) values(o.user_id,o.batch,'paid',o.id)
   on conflict(user_id) do update set source='paid',order_id=excluded.order_id,legacy_order_id=null,grant_note=null,active=true where not initiation_members.active;
  if not found then raise exception 'Membership is already active'; end if;
 end if;
 if o.order_kind in ('standard','legacy_upgrade') then
  insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id) on conflict(user_id) do update set order_id=excluded.order_id,active=true where not initiation_entitlements.active and initiation_entitlements.console_claimed_at is null;
  if not found then raise exception 'Console claim requires reconciliation'; end if;
 end if;
 if o.legacy_order_id is not null then perform public.ensure_legacy_initiation_packs(o.user_id); end if;
 positions:=case o.order_kind when 'membership' then '{}'::integer[] when 'initial' then array[1,2] when 'standard' then array[1,2,3,4] else array[3,4] end;
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select o.user_id,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) schedule(n,month) where n=any(positions)
 on conflict(user_id,position) do update set order_id=excluded.order_id,status='planned',tracking_url=null,tracking_number=null
  where initiation_shipments.status='canceled';
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,member_source='paid',
  member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),member_since=coalesce(member_since,p_paid_at),batch_label='S26' where id=o.user_id;
 return o.id;
end $$;

alter function membership_private.access_role_for(uuid) rename to access_role_for_pre_membership;
create function membership_private.access_role_for(uid uuid) returns text
language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
 if public.eligible_voyager_membership_order(uid) is not null or exists(
  select 1 from initiation_members m join initiation_orders o on o.id=m.order_id join initiation_shopify_checkouts c on c.order_id=o.id
  where m.user_id=uid and m.active and m.source='paid' and o.order_kind<>'membership' and o.paid_at is not null
   and c.capture_id is not null and c.refunded_amount>0 and c.refunded_amount<o.amount and c.canceled_at is null
 ) then
  if exists(select 1 from voyager_profiles where id=uid and role='architect' and account_kind='human') then return 'architect'; end if;
  return 'voyager';
 end if;
 return membership_private.access_role_for_pre_membership(uid);
end $$;

create function public.reconcile_initiation_shopify_reversal(
 p_reservation uuid,p_shop text,p_order_id text,p_authorization_id text,p_capture_id text,p_paid_at timestamptz,
 p_updated_at timestamptz,p_refunded integer,p_packs integer[],p_canceled boolean,p_review boolean,p_shipping jsonb default null
) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; c initiation_shopify_checkouts; root uuid;
begin
 perform 1 from initiation_batches where label='S26' for update;
 select * into strict o from initiation_orders where id=p_reservation for update;
 select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
 if p_canceled and p_capture_id is null and c.shop=p_shop and c.shopify_order_id is null and c.authorization_id is null
  and o.status in ('pending','canceled') and o.paid_at is null and p_refunded=0 and p_order_id is not null and p_authorization_id is not null then
  update initiation_shopify_checkouts set shopify_order_id=p_order_id,authorization_id=p_authorization_id where order_id=o.id returning * into c;
 end if;
 if c.shop is distinct from p_shop or c.shopify_order_id is distinct from p_order_id or c.authorization_id is distinct from p_authorization_id
  or c.authorization_id is null or p_updated_at is null or p_refunded is null or p_refunded<0 or p_refunded>o.amount
  or (p_capture_id is not null and c.capture_id is not null and c.capture_id<>p_capture_id)
  or exists(select 1 from unnest(p_packs) n where n not between 1 and 4) then raise exception 'Refund does not match the verified payment'; end if;
 if exists(select 1 from unnest(p_packs) n where not n=any(case o.order_kind when 'membership' then '{}'::integer[] when 'initial' then array[1,2] when 'standard' then array[1,2,3,4] else array[3,4] end)) then raise exception 'Refund Pack is not included in this order'; end if;
 if c.last_financial_update>p_updated_at then return; end if;
 if c.capture_id is null and p_capture_id is not null and p_refunded<o.amount and o.order_kind<>'membership' and not p_canceled then
  perform public.confirm_initiation_shopify_capture(o.id,p_shop,p_order_id,p_authorization_id,p_capture_id,p_paid_at,p_shipping);
 end if;
 if p_capture_id is null and o.paid_at is not null then raise exception 'A captured payment cannot be canceled without capture evidence'; end if;
 update initiation_shopify_checkouts set capture_id=coalesce(capture_id,p_capture_id),
  refunded_amount=greatest(refunded_amount,p_refunded),
  refunded_packs=array(select distinct n from unnest(refunded_packs||coalesce(p_packs,'{}')) n order by n),
  canceled_at=case when p_canceled then coalesce(canceled_at,p_updated_at) else canceled_at end,
  refund_review=p_review,last_financial_update=p_updated_at where order_id=o.id returning * into c;
 update initiation_orders set paid_at=coalesce(paid_at,p_paid_at),status=case
  when c.canceled_at is not null and c.refunded_amount=0 then 'canceled'
  when c.refunded_amount>=amount or (order_kind='membership' and c.refunded_amount>0) then 'refunded'
  when c.refund_review then 'payment_review' else status end where id=o.id;
 update initiation_shipments set status='canceled' where order_id=o.id and status in ('planned','preparing')
  and (position=any(c.refunded_packs) or c.canceled_at is not null);
 if c.refunded_amount>=o.amount or c.canceled_at is not null or c.refund_review or 3=any(c.refunded_packs) then
  update initiation_entitlements set active=false where order_id=o.id;
 end if;
 if o.order_kind='membership' then
  update initiation_members set active=false where user_id=o.user_id and source='paid' and order_id=o.id;
  update initiation_orders set status='payment_review' where membership_order_id=o.id and status in ('pending','paid');
  update initiation_entitlements set active=false where order_id in(select id from initiation_orders where membership_order_id=o.id);
  update initiation_shipments set status='canceled' where order_id in(select id from initiation_orders where membership_order_id=o.id) and status in ('planned','preparing');
 else
  root:=public.eligible_voyager_membership_order(o.user_id);
  if root is not null then update initiation_members set active=true,order_id=root where user_id=o.user_id and source='paid';
  elsif c.refunded_amount>=o.amount or c.canceled_at is not null then
   update initiation_members set active=false where user_id=o.user_id and source='paid' and order_id=o.id;
  end if;
  if o.order_kind='initial' and (c.refunded_amount>0 or c.canceled_at is not null) then
   update initiation_orders set status='payment_review' where initial_order_id=o.id and status='paid';
   update initiation_entitlements set active=false where order_id in(select id from initiation_orders where initial_order_id=o.id);
  end if;
 end if;
 update voyager_profiles set role=membership_private.access_role_for(o.user_id)::user_role where id=o.user_id and role<>'architect';
end $$;

alter function public.initiation_access_state(uuid) rename to initiation_access_state_pre_membership;
create function public.initiation_access_state(p_user uuid) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select public.initiation_access_state_pre_membership(p_user) || jsonb_build_object('formal',
  public.eligible_voyager_membership_order(p_user) is not null or (public.initiation_access_state_pre_membership(p_user)->>'formal')::boolean);
$$;
revoke all on function public.initiation_access_state(uuid),membership_private.access_role_for(uuid) from public,anon,authenticated;
grant execute on function public.initiation_access_state(uuid) to service_role;
grant usage on schema membership_private to service_role;
grant execute on function membership_private.access_role_for(uuid),membership_private.access_role_for_pre_membership(uuid),membership_private.access_role_for_pre_bundles(uuid) to service_role;

revoke all on function public.eligible_voyager_membership_order(uuid),public.reserve_initiation_shopify_v3(uuid,text,text,text,text,text),
 public.reconcile_initiation_shopify_reversal(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer[],boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.eligible_voyager_membership_order(uuid),public.reserve_initiation_shopify_v3(uuid,text,text,text,text,text),
 public.reconcile_initiation_shopify_reversal(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer[],boolean,boolean,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
