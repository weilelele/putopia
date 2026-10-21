-- Voyager bundles v1: Initial $38, Complete $488, all Initial upgrades $460.
-- NOT APPLIED. Preserves every historical amount, Price ID, order and receipt.
-- Requires membership v94 and existing outboxes. Does not open checkout.
begin;
alter table public.initiation_orders add column pricing_version text;
alter table public.initiation_orders add column initial_order_id uuid references public.initiation_orders(id);
alter table public.initiation_orders alter column amount drop default;
alter table public.initiation_orders drop constraint initiation_order_offer_check;
alter table public.initiation_orders add constraint initiation_order_offer_check check (
 (pricing_version is null and initial_order_id is null and
  ((order_kind='standard' and amount=52000 and legacy_order_id is null) or
   (order_kind='legacy_upgrade' and amount=40000 and legacy_order_id is not null))) or
 (pricing_version is not null and pricing_version='voyager-bundles-v1' and
  ((order_kind='initial' and amount=3800 and legacy_order_id is null and initial_order_id is null) or
   (order_kind='standard' and amount=48800 and legacy_order_id is null and initial_order_id is null) or
   (order_kind='legacy_upgrade' and amount=46000 and
    ((legacy_order_id is not null and initial_order_id is null) or (legacy_order_id is null and initial_order_id is not null)))))
);
drop index public.initiation_one_open_order;
create unique index initiation_one_pending_order on public.initiation_orders(user_id)
 where status='pending';
create unique index initiation_one_initial_order on public.initiation_orders(user_id)
 where order_kind='initial' and status in ('paid','payment_review','disputed');
create unique index initiation_one_complete_order on public.initiation_orders(user_id)
 where order_kind<>'initial' and status in ('paid','payment_review','disputed');

create function public.eligible_initial_initiation_order(p_user uuid) returns uuid
language sql stable security invoker set search_path=public,pg_temp as $$
 select o.id from initiation_orders o join voyager_profiles p on p.id=o.user_id
 join initiation_members m on m.user_id=o.user_id
 where o.user_id=p_user and p.account_kind='human' and o.order_kind='initial'
 and o.pricing_version='voyager-bundles-v1' and o.amount=3800 and o.currency='usd'
 and o.status='paid' and o.paid_at is not null and o.stripe_payment_intent is not null
 and not exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent)
 order by o.paid_at,o.id limit 1;
$$;
-- A person and their Initial/upgrade orders occupy only one seat, including holds.
create or replace function public.initiation_occupied_seats() returns bigint
language sql stable security invoker set search_path=public,pg_temp as $$
 select count(*) from (
  select user_id from initiation_members where batch='S26'
  union select user_id from initiation_orders where batch='S26'
   and status in ('pending','paid','payment_review','disputed','refunded')
 ) seats;
$$;
-- Old application builds must not reserve new orders at retired prices.
create or replace function public.reserve_initiation(p_user uuid,p_price text,p_product text,p_kind text,p_device_source text default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
begin raise exception 'Bundle pricing requires the updated application'; end $$;

create function public.reserve_initiation_v2(p_user uuid,p_price text,p_product text,p_kind text,p_device_source text default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; old_id uuid; initial_id uuid; owns_seat boolean;
begin
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null or not b.checkout_open then raise exception 'Initiation checkout is closed'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'Only human accounts may start a payment'; end if;
 if not exists(select 1 from voyager_intake where user_id=p_user and version='voyager-profile-v1') then raise exception 'Calibration required'; end if;
 if exists(select 1 from initiation_entitlements where user_id=p_user) then raise exception 'Existing Console entitlement requires reconciliation'; end if;
 if p_price !~ '^price_' or p_product !~ '^prod_' then raise exception 'Dedicated bundle price required'; end if;
 old_id:=public.eligible_legacy_initiation_order(p_user);
 initial_id:=public.eligible_initial_initiation_order(p_user);
 if p_kind not in ('initial','standard','legacy_upgrade') or p_kind is null then raise exception 'Invalid bundle'; end if;
 if (old_id is not null or initial_id is not null) <> (p_kind='legacy_upgrade') then raise exception 'Price eligibility changed; refresh checkout'; end if;
 if old_id is null and initial_id is null and exists(select 1 from initiation_shipments where user_id=p_user) then raise exception 'Existing fulfillment requires reconciliation'; end if;
 if exists(select 1 from initiation_members where user_id=p_user) and initial_id is null then raise exception 'Existing membership requires reconciliation'; end if;
 if old_id is not null and (exists(select 1 from voyager_orders where id=old_id and status in ('shipped','delivered')) or exists(select 1 from device_order_packs where order_id=old_id and status in ('shipped','dispatched','delivered')))
 and (select count(*) from initiation_shipments where user_id=p_user and position in (1,2))<>2 then raise exception 'Historical Pack fulfillment requires reconciliation'; end if;
 select * into o from initiation_orders where user_id=p_user and status in ('pending','payment_review','disputed');
 if o.id is not null then
  if o.status<>'pending' or o.order_kind<>p_kind or o.price_id<>p_price or o.product_id<>p_product or o.pricing_version is distinct from 'voyager-bundles-v1' then raise exception 'Existing checkout requires reconciliation'; end if;
  return to_jsonb(o);
 end if;
 select exists(select 1 from initiation_members where user_id=p_user) into owns_seat;
 if not owns_seat and public.initiation_occupied_seats()>=b.capacity then raise exception 'S26 seats are fully reserved'; end if;
 insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,legacy_order_id,initial_order_id,device_source,stripe_livemode,pricing_version)
 values(p_user,p_price,p_product,p_kind,case p_kind when 'initial' then 3800 when 'standard' then 48800 else 46000 end,
 case when initial_id is null then old_id end,initial_id,p_device_source,b.stripe_livemode,'voyager-bundles-v1') returning * into o;
 return to_jsonb(o);
end $$;

alter function public.complete_initiation(uuid,text,uuid,text,jsonb) rename to complete_initiation_pre_bundles;
create function public.complete_initiation(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; b initiation_batches; hold_reason text;
begin
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.id is null or o.user_id<>p_user or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or (o.stripe_payment_intent is not null and o.stripe_payment_intent<>p_intent) then raise exception 'Payment binding mismatch'; end if;
 -- Old receipts and new Complete / historical-$12 upgrade use the proven flow.
 if o.order_kind<>'initial' and o.initial_order_id is null then
  perform public.complete_initiation_pre_bundles(p_order,p_session,p_user,p_intent,p_shipping); return;
 end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'NPC payment cannot activate membership'; end if;
 if b.label is null or public.initiation_occupied_seats()>b.capacity then raise exception 'Capacity requires reconciliation'; end if;
 if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')='' or coalesce(trim(p_shipping->'address'->>'country'),'') !~ '^[A-Z]{2}$' then raise exception 'Verified Stripe shipping address required'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 if o.initial_order_id is not null and o.initial_order_id is distinct from public.eligible_initial_initiation_order(p_user) then hold_reason:='payment_review'; end if;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=o.id;
 if hold_reason is not null then return; end if;
 if o.order_kind='initial' then
  if exists(select 1 from initiation_members where user_id=p_user) then raise exception 'Existing membership requires reconciliation'; end if;
  insert into initiation_members(user_id,batch,source,order_id) values(p_user,o.batch,'paid',o.id);
 else
  if not exists(select 1 from initiation_members where user_id=p_user and source='paid' and order_id=o.initial_order_id and active) then raise exception 'Initial membership requires reconciliation'; end if;
  update initiation_members set order_id=o.id where user_id=p_user;
  insert into initiation_entitlements(user_id,order_id) values(p_user,o.id);
 end if;
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select p_user,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) s(n,month)
 where (o.order_kind='initial' and n<=2) or (o.order_kind='legacy_upgrade' and n>2);
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=p_user;
end $$;

-- The v94 partial-refund handler calls this name directly: extend that path too.
alter function public.hold_initiation_payment_v90(text,text) rename to hold_initiation_payment_pre_bundles;
create function public.hold_initiation_payment_v90(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform public.hold_initiation_payment_pre_bundles(p_intent,p_reason);
 -- Reversing an upgrade does not revoke an independently paid Initial member.
 update initiation_members m set order_id=source.id,active=true
 from initiation_orders upgrade join initiation_orders source on source.id=upgrade.initial_order_id
 where m.order_id=upgrade.id and upgrade.stripe_payment_intent=p_intent
 and source.id=public.eligible_initial_initiation_order(m.user_id);
 update initiation_orders set status='payment_review' where status='paid' and initial_order_id in
 (select id from initiation_orders where stripe_payment_intent=p_intent);
 update initiation_entitlements set active=false where order_id in
 (select id from initiation_orders where status='payment_review' and initial_order_id in
  (select id from initiation_orders where stripe_payment_intent=p_intent));
 update initiation_members set active=false where order_id in
 (select id from initiation_orders where status='payment_review' and initial_order_id in
  (select id from initiation_orders where stripe_payment_intent=p_intent));
end $$;

alter function membership_private.access_role_for(uuid) rename to access_role_for_pre_bundles;
create function membership_private.access_role_for(uid uuid) returns text
language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
 if public.eligible_initial_initiation_order(uid) is not null then
  if exists(select 1 from voyager_profiles where id=uid and role='architect' and account_kind='human') then return 'architect'; end if;
  return 'voyager';
 end if;
 return membership_private.access_role_for_pre_bundles(uid);
end $$;
alter function public.initiation_access_state(uuid) rename to initiation_access_state_pre_bundles;
create function public.initiation_access_state(p_user uuid) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select public.initiation_access_state_pre_bundles(p_user) || jsonb_build_object(
 'legacy',public.eligible_legacy_initiation_order(p_user) is not null or public.eligible_initial_initiation_order(p_user) is not null,
 'formal',exists(select 1 from initiation_members where user_id=p_user and active and source='paid') and public.eligible_initial_initiation_order(p_user) is not null
  or (public.initiation_access_state_pre_bundles(p_user)->>'formal')::boolean);
$$;

alter function public.fulfill_initiation_shipment(uuid,uuid,text,text) rename to fulfill_initiation_shipment_pre_bundles;
create function public.fulfill_initiation_shipment(p_actor uuid,p_shipment uuid,p_status text,p_tracking text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare s initiation_shipments;
begin
 perform 1 from initiation_batches where label='S26' for update;
 select * into s from initiation_shipments where id=p_shipment;
 if s.position in (1,2) and s.order_id=public.eligible_initial_initiation_order(s.user_id) then
  if not exists(select 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human') then raise exception 'Forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||s.user_id::text,0));
  select * into s from initiation_shipments where id=p_shipment for update;
  if not (p_status=s.status or (s.status='planned' and p_status='preparing') or (s.status='preparing' and p_status='dispatched') or (s.status='dispatched' and p_status='delivered')) then raise exception 'Invalid shipment transition'; end if;
  if p_status in ('dispatched','delivered') and coalesce(p_tracking,s.tracking_url,'') !~ '^https://[^/[:space:]]+' then raise exception 'Tracking URL required'; end if;
  if s.status in ('dispatched','delivered') and p_tracking is not null and p_tracking is distinct from s.tracking_url then raise exception 'Dispatched tracking is immutable'; end if;
  update initiation_shipments set status=p_status,tracking_url=coalesce(p_tracking,tracking_url) where id=p_shipment;
 else
  perform public.fulfill_initiation_shipment_pre_bundles(p_actor,p_shipment,p_status,p_tracking);
 end if;
end $$;

create function public.guard_initiation_quote() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if row(new.user_id,new.order_kind,new.amount,new.currency,new.price_id,new.product_id,new.stripe_livemode,new.pricing_version,new.legacy_order_id,new.initial_order_id)
 is distinct from row(old.user_id,old.order_kind,old.amount,old.currency,old.price_id,old.product_id,old.stripe_livemode,old.pricing_version,old.legacy_order_id,old.initial_order_id)
 then raise exception 'Saved purchase quotes are immutable'; end if;
 return new;
end $$;
create trigger initiation_quote_immutable before update on public.initiation_orders
 for each row execute function public.guard_initiation_quote();
revoke all on function public.eligible_initial_initiation_order(uuid),public.reserve_initiation_v2(uuid,text,text,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment_v90(text,text),public.initiation_access_state(uuid),public.fulfill_initiation_shipment(uuid,uuid,text,text),public.guard_initiation_quote() from public,anon,authenticated;
grant execute on function public.eligible_initial_initiation_order(uuid),public.reserve_initiation_v2(uuid,text,text,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment_v90(text,text),public.initiation_access_state(uuid),public.fulfill_initiation_shipment(uuid,uuid,text,text) to service_role;
revoke all on function membership_private.access_role_for(uuid) from public,anon,authenticated;
commit;
