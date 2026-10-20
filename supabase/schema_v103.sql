-- Four offers: existing $520/$400 contracts remain intact. No backfill, prices,
-- checkout activation or production application is performed by this migration.
begin;
alter table public.initiation_orders add column initial_order_id uuid references public.initiation_orders(id);
alter table public.initiation_orders drop constraint initiation_order_offer_check;
alter table public.initiation_orders add constraint initiation_order_offer_check check (
 (order_kind='standard' and amount=52000 and legacy_order_id is null and initial_order_id is null) or
 (order_kind='legacy_upgrade' and amount=40000 and legacy_order_id is not null and initial_order_id is null) or
 (order_kind='initial' and amount=4800 and legacy_order_id is null and initial_order_id is null) or
 (order_kind='initial_upgrade' and amount=50000 and legacy_order_id is null and initial_order_id is not null));
drop index public.initiation_one_open_order;
create unique index initiation_one_open_order on public.initiation_orders(user_id,(order_kind='initial_upgrade'))
 where status in ('pending','payment_review','disputed');
create unique index initiation_one_paid_offer on public.initiation_orders(user_id,order_kind) where status='paid';

create function public.eligible_initial_initiation_order(p_user uuid) returns uuid
language sql stable security invoker set search_path=public,pg_temp as $$
 select o.id from initiation_orders o join initiation_members m on m.order_id=o.id and m.user_id=o.user_id
 join voyager_profiles p on p.id=o.user_id
 where o.user_id=p_user and p.account_kind='human' and o.order_kind='initial' and o.amount=4800
 and o.currency='usd' and o.status='paid' and o.paid_at is not null
 and o.stripe_session_id is not null and o.stripe_payment_intent is not null and m.active
 and not exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent)
 limit 1;
$$;

-- An Initial purchase followed by its upgrade still occupies exactly ONE seat.
create or replace function public.initiation_occupied_seats() returns bigint
language sql stable security invoker set search_path=public,pg_temp as $$
 select count(*) from (
  select user_id from initiation_members where batch='S26'
  union
  select user_id from initiation_orders where batch='S26' and status in ('pending','paid','payment_review','disputed','refunded')
 ) members;
$$;

-- Delegate unchanged historical offers to their existing implementation.
alter function public.reserve_initiation(uuid,text,text,text,text) rename to reserve_initiation_v90;
create function public.reserve_initiation(p_user uuid,p_price text,p_product text,p_kind text,p_device_source text default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; initial_id uuid;
begin
 if p_kind in ('standard','legacy_upgrade') then
  return public.reserve_initiation_v90(p_user,p_price,p_product,p_kind,p_device_source);
 end if;
 if p_kind not in ('initial','initial_upgrade') or p_kind is null then raise exception 'Invalid bundle'; end if;
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null or not b.checkout_open then raise exception 'Initiation checkout is closed'; end if;
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'Only human accounts may start a payment'; end if;
 if not exists(select 1 from voyager_intake where user_id=p_user and version='voyager-profile-v1') then raise exception 'Calibration required'; end if;
 if public.eligible_legacy_initiation_order(p_user) is not null then raise exception 'Historical members retain the legacy upgrade'; end if;
 if exists(select 1 from initiation_entitlements where user_id=p_user) then raise exception 'Existing Console record requires reconciliation'; end if;
 initial_id:=public.eligible_initial_initiation_order(p_user);
 if p_kind='initial' and (initial_id is not null or exists(select 1 from initiation_members where user_id=p_user)
  or exists(select 1 from initiation_orders where user_id=p_user and status in ('paid','refunded'))) then raise exception 'Existing membership requires reconciliation'; end if;
 if p_kind='initial_upgrade' and initial_id is null then raise exception 'A paid active Initial Pack is required'; end if;
 select * into o from initiation_orders where user_id=p_user and status in ('pending','payment_review','disputed') for update;
 if o.id is not null then
  if o.status<>'pending' or o.order_kind<>p_kind or o.price_id<>p_price or o.product_id<>p_product
    or o.initial_order_id is distinct from (case when p_kind='initial_upgrade' then initial_id else null end) then raise exception 'Existing checkout requires reconciliation'; end if;
  return to_jsonb(o);
 end if;
 if p_kind='initial' and public.initiation_occupied_seats()>=b.capacity then raise exception 'S26 seats are fully reserved'; end if;
 insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,initial_order_id,device_source,stripe_livemode)
 values(p_user,p_price,p_product,p_kind,case when p_kind='initial' then 4800 else 50000 end,
  case when p_kind='initial_upgrade' then initial_id else null end,p_device_source,b.stripe_livemode) returning * into o;
 return to_jsonb(o);
end $$;

alter function public.complete_initiation(uuid,text,uuid,text,jsonb) rename to complete_initiation_v90;
create function public.complete_initiation(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; b initiation_batches; hold_reason text;
begin
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.order_kind in ('standard','legacy_upgrade') then
  perform public.complete_initiation_v90(p_order,p_session,p_user,p_intent,p_shipping); return;
 end if;
 if o.id is null or o.user_id<>p_user or (o.stripe_session_id is not null and o.stripe_session_id<>p_session)
  or (o.stripe_payment_intent is not null and o.stripe_payment_intent<>p_intent) then raise exception 'Payment binding mismatch'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'NPC payment cannot activate membership'; end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 if b.label is null or public.initiation_occupied_seats()>b.capacity then raise exception 'Capacity requires reconciliation'; end if;
 if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')=''
  or coalesce(trim(p_shipping->'address'->>'country'),'') !~ '^[A-Z]{2}$' then raise exception 'Verified Stripe shipping address required'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 if hold_reason is null and o.order_kind='initial_upgrade'
  and o.initial_order_id is distinct from public.eligible_initial_initiation_order(p_user) then
  update initiation_orders set status='payment_review',stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
  return;
 end if;
 if o.order_kind='initial' and exists(select 1 from initiation_members where user_id=p_user) then raise exception 'Existing membership requires reconciliation'; end if;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
 if hold_reason is not null then return; end if;
 if o.order_kind='initial' then
  insert into initiation_members(user_id,batch,source,order_id) values(p_user,o.batch,'paid',o.id);
 else
  -- Keep membership tied to the Initial purchase: reversing the upgrade cannot
  -- revoke the independently paid digital membership or first two shipments.
  insert into initiation_entitlements(user_id,order_id) values(p_user,o.id);
 end if;
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select p_user,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) s(n,month)
 where (o.order_kind='initial' and n<=2) or (o.order_kind='initial_upgrade' and n>2);
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=p_user;
end $$;

-- v94 refund/dispute entry points call this internal function. Preserve their
-- cumulative refund ledger and extend the dependency freeze to $48 -> $500.
alter function public.hold_initiation_payment_v90(text,text) rename to hold_initiation_payment_before_bundles;
create function public.hold_initiation_payment_v90(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform public.hold_initiation_payment_before_bundles(p_intent,p_reason);
 update initiation_orders set status='payment_review' where order_kind='initial_upgrade' and status='paid'
 and initial_order_id in(select id from initiation_orders where stripe_payment_intent=p_intent);
 update initiation_entitlements set active=false where order_id in(
  select id from initiation_orders where order_kind='initial_upgrade'
  and initial_order_id in(select id from initiation_orders where stripe_payment_intent=p_intent));
end $$;

create or replace function public.initiation_access_state(p_user uuid) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'formal',public.eligible_initial_initiation_order(p_user) is not null or exists(select 1 from initiation_members m where m.user_id=p_user and m.active and
 (m.source='granted' or exists(select 1 from initiation_entitlements e join initiation_orders o on o.id=e.order_id where e.user_id=p_user and e.order_id=m.order_id and e.active and o.status='paid'))),
 'legacy',public.eligible_legacy_initiation_order(p_user) is not null,
 'source',(select source from initiation_members where user_id=p_user),
 'refundOrDispute',exists(select 1 from initiation_orders where user_id=p_user and status in ('refunded','disputed','payment_review')) or
 exists(select 1 from voyager_orders o where o.user_id=p_user and o.product_type='voyager_pack' and (o.status='refunded' or exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent))));
$$;

-- Existing access policy continues unchanged after the new Initial evidence.
alter function membership_private.access_role_for(uuid) rename to access_role_before_bundles;
create function membership_private.access_role_for(uid uuid) returns text
language sql stable security invoker set search_path=public,pg_temp as $$
 select case when public.eligible_initial_initiation_order(uid) is not null then
  case when exists(select 1 from voyager_profiles where id=uid and role='architect' and account_kind='human') then 'architect' else 'voyager' end
 else membership_private.access_role_before_bundles(uid) end;
$$;

-- A stored profile badge must not retain paid posting rights after reversal.
-- Existing author/creator and NPC policies remain in force alongside this guard.
create policy feed_paid_membership_guard on public.voyager_feed_entries as restrictive
 for insert to authenticated with check (
  parent_id is not null or (select public.effective_access_role()) in ('voyager','architect')
 );

-- First-two shipments do not require ownership of a Console.
alter function public.fulfill_initiation_shipment(uuid,uuid,text,text) rename to fulfill_initiation_shipment_v90;
create function public.fulfill_initiation_shipment(p_actor uuid,p_shipment uuid,p_status text,p_tracking text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare s initiation_shipments;
begin
 perform 1 from initiation_batches where label='S26' for update;
 select * into s from initiation_shipments where id=p_shipment;
 if s.order_id is distinct from public.eligible_initial_initiation_order(s.user_id) or s.order_id is null then
  perform public.fulfill_initiation_shipment_v90(p_actor,p_shipment,p_status,p_tracking); return;
 end if;
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human') then raise exception 'Forbidden'; end if;
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||s.user_id::text,0));
 select * into s from initiation_shipments where id=p_shipment for update;
 if s.position not in (1,2) then raise exception 'Initial Pack shipment mismatch'; end if;
 if not (p_status=s.status or (s.status='planned' and p_status='preparing') or (s.status='preparing' and p_status='dispatched') or (s.status='dispatched' and p_status='delivered')) then raise exception 'Invalid shipment transition'; end if;
 if p_status in ('dispatched','delivered') and coalesce(p_tracking,s.tracking_url,'') !~ '^https://[^/[:space:]]+' then raise exception 'Tracking URL required'; end if;
 if s.status in ('dispatched','delivered') and p_tracking is not null and p_tracking is distinct from s.tracking_url then raise exception 'Dispatched tracking is immutable'; end if;
 update initiation_shipments set status=p_status,tracking_url=coalesce(p_tracking,tracking_url) where id=p_shipment;
end $$;

revoke all on function public.eligible_initial_initiation_order(uuid),public.reserve_initiation(uuid,text,text,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment_v90(text,text),public.fulfill_initiation_shipment(uuid,uuid,text,text),membership_private.access_role_for(uuid) from public,anon,authenticated;
grant execute on function public.eligible_initial_initiation_order(uuid),public.reserve_initiation(uuid,text,text,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment_v90(text,text),public.fulfill_initiation_shipment(uuid,uuid,text,text),membership_private.access_role_for(uuid) to service_role;
notify pgrst,'reload schema';
commit;
