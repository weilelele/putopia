-- P0: standard $520 and verified legacy $400 upgrade. Requires v85.
-- LOCAL ONLY: root must review before application. Does not open checkout.
begin;
alter table public.initiation_batches add column stripe_livemode boolean not null default true;
alter table public.initiation_orders add column stripe_livemode boolean not null default true;
alter table public.initiation_orders drop constraint initiation_orders_amount_check;
alter table public.initiation_orders add column order_kind text not null default 'standard';
alter table public.initiation_orders add column legacy_order_id uuid references public.voyager_orders(id);
alter table public.initiation_orders add column device_source text;
alter table public.initiation_orders add constraint initiation_order_offer_check check (
 (order_kind='standard' and amount=52000 and legacy_order_id is null) or
 (order_kind='legacy_upgrade' and amount=40000 and legacy_order_id is not null));
alter table public.initiation_orders add constraint initiation_device_source_check check(device_source is null or device_source='/devices' or device_source ~ '^/devices/batches/[a-z0-9][a-z0-9-]*$');
-- One physical delivery per person/position, across legacy and upgraded membership.
alter table public.initiation_shipments alter column order_id drop not null;
alter table public.initiation_shipments add column legacy_order_id uuid references public.voyager_orders(id);
alter table public.initiation_shipments add constraint initiation_shipment_provenance check(order_id is not null or (legacy_order_id is not null and position in (1,2)));
create unique index initiation_shipments_member_position on public.initiation_shipments(user_id,position);

create function public.eligible_legacy_initiation_order(p_user uuid) returns uuid
language sql stable security invoker set search_path=public as $$
 select o.id from voyager_orders o join voyager_profiles p on p.id=o.user_id
 where o.user_id=p_user and p.account_kind='human' and o.product_type='voyager_pack'
 and o.amount=1200 and lower(o.currency)='usd' and o.paid_at is not null
 and o.stripe_session_id ~ '^cs_live_' and o.stripe_payment_intent ~ '^pi_'
 and o.status in ('paid','preparing','shipped','delivered')
 and not exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent)
 order by o.paid_at,o.id limit 1;
$$;
create function public.ensure_legacy_initiation_packs(p_user uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare legacy_id uuid;
begin
 perform 1 from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 legacy_id:=public.eligible_legacy_initiation_order(p_user);
 if legacy_id is null then return; end if;
 -- Prior dispatched history needs manual mapping, not invented Oct/Nov dispatches.
 if exists(select 1 from voyager_orders where id=legacy_id and status in ('shipped','delivered')) or exists(select 1 from device_order_packs where order_id=legacy_id and status in ('shipped','dispatched','delivered')) then return; end if;
 insert into initiation_shipments(user_id,legacy_order_id,position,title,scheduled_month)
 values(p_user,legacy_id,1,'Initiation Pack 1','2026-10'),(p_user,legacy_id,2,'Initiation Pack 2','2026-11')
 on conflict(user_id,position) do nothing;
end $$;
-- No bulk historical shipment backfill. The helper runs on confirmed upgrade,
-- or a later individually authorized fulfillment workflow.

-- New signature prevents old deployed code from accidentally charging a legacy buyer $520.
drop function public.reserve_initiation(uuid,text,text);
create function public.reserve_initiation(p_user uuid,p_price text,p_product text,p_kind text,p_device_source text default null) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare b initiation_batches; o initiation_orders; legacy_id uuid; kind text;
begin
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null or not b.checkout_open then raise exception 'Initiation checkout is closed'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'Only human accounts may start a payment'; end if;
 if exists(select 1 from initiation_members where user_id=p_user) or exists(select 1 from initiation_entitlements where user_id=p_user) then raise exception 'Existing Initiation record requires reconciliation'; end if;
 if not exists(select 1 from voyager_intake where user_id=p_user and version='voyager-profile-v1') then raise exception 'Calibration required'; end if;
 legacy_id:=public.eligible_legacy_initiation_order(p_user);
 kind:=case when legacy_id is not null then 'legacy_upgrade' else 'standard' end;
 if p_kind is distinct from kind then raise exception 'Price eligibility changed; refresh checkout'; end if;
 if kind='legacy_upgrade' and (exists(select 1 from voyager_orders where id=legacy_id and status in ('shipped','delivered')) or exists(select 1 from device_order_packs where order_id=legacy_id and status in ('shipped','dispatched','delivered'))) and (select count(*) from initiation_shipments where user_id=p_user and position in (1,2))<>2 then raise exception 'Historical Pack fulfillment requires reconciliation before checkout'; end if;
 select * into o from initiation_orders where user_id=p_user and status in ('pending','paid','payment_review','disputed');
 if o.id is not null then
  if o.status <> 'pending' or o.order_kind <> kind or o.price_id <> p_price or o.product_id <> p_product then raise exception 'Existing checkout requires reconciliation'; end if;
  return to_jsonb(o);
 end if;
 if public.initiation_occupied_seats() >= b.capacity then raise exception 'S26 seats are fully reserved'; end if;
 insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,legacy_order_id,device_source,stripe_livemode)
 values(p_user,p_price,p_product,kind,case when kind='legacy_upgrade' then 40000 else 52000 end,legacy_id,p_device_source,b.stripe_livemode) returning * into o;
 return to_jsonb(o);
end $$;

create or replace function public.complete_initiation(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare o initiation_orders; hold_reason text; b initiation_batches;
begin
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.id is null or o.user_id <> p_user or (o.stripe_session_id is not null and o.stripe_session_id <> p_session) then raise exception 'Payment binding mismatch'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'NPC payment cannot activate membership'; end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 if b.label is null or public.initiation_occupied_seats() > b.capacity then raise exception 'Capacity requires reconciliation'; end if;
 if exists(select 1 from initiation_members where user_id=p_user) then raise exception 'Existing membership requires reconciliation'; end if;
 if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')='' or coalesce(trim(p_shipping->'address'->>'country'),'') !~ '^[A-Z]{2}$' then raise exception 'Verified Stripe shipping address required'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 -- A legacy refund can win the race with the upgrade payment. Never silently
 -- grant discounted entitlements or charge a difference; retain for review.
 if hold_reason is null and o.order_kind='legacy_upgrade' and o.legacy_order_id is distinct from public.eligible_legacy_initiation_order(p_user) then
  update initiation_orders set status='payment_review',stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
  return;
 end if;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
 if hold_reason is not null then return; end if;
 if o.order_kind='legacy_upgrade' then
  perform public.ensure_legacy_initiation_packs(p_user);
  if (select count(*) from initiation_shipments where user_id=p_user and position in (1,2)) <> 2 then raise exception 'Historical Pack fulfillment requires reconciliation'; end if;
 end if;
 insert into initiation_members(user_id,batch,source,order_id) values(o.user_id,o.batch,'paid',o.id);
 insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id);
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select o.user_id,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) s(n,month)
 where o.order_kind='standard' or n>2
 on conflict(user_id,position) do update set order_id=excluded.order_id
 -- Revoked historical first-two ownership is retained and never scheduled twice.
 where initiation_shipments.order_id is null;
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=o.user_id;
end $$;

-- One reversal ledger covers both historical qualifying payment and Initiation.
-- For a legacy refund, suspend any dependent discounted membership for review.
create or replace function public.hold_initiation_payment(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from initiation_batches where label='S26' for update;
 if p_reason not in ('refunded','disputed') then raise exception 'Invalid payment hold'; end if;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 insert into initiation_payment_holds(payment_intent,reason) values(p_intent,p_reason)
 on conflict(payment_intent) do update set reason=case when initiation_payment_holds.reason='refunded' then 'refunded' else excluded.reason end;
 update initiation_orders set status=(select reason from initiation_payment_holds where payment_intent=p_intent) where stripe_payment_intent=p_intent;
 update initiation_orders set status='payment_review' where order_kind='legacy_upgrade' and status='paid' and legacy_order_id in(select id from voyager_orders where stripe_payment_intent=p_intent);
 update initiation_entitlements set active=false where order_id in(select id from initiation_orders where status in ('refunded','disputed','payment_review') and (stripe_payment_intent=p_intent or legacy_order_id in(select id from voyager_orders where stripe_payment_intent=p_intent)));
 update initiation_members set active=false where source='paid' and order_id in(select id from initiation_orders where status in ('refunded','disputed','payment_review') and (stripe_payment_intent=p_intent or legacy_order_id in(select id from voyager_orders where stripe_payment_intent=p_intent)));
end $$;
-- Historical first-two Packs can be fulfilled while temporary membership is valid.
create or replace function public.fulfill_initiation_shipment(p_actor uuid,p_shipment uuid,p_status text,p_tracking text) returns void
language plpgsql security invoker set search_path=public as $$
declare s initiation_shipments;
begin
 perform 1 from initiation_batches where label='S26' for update;
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human') then raise exception 'Forbidden'; end if;
 select * into s from initiation_shipments where id=p_shipment;
 if s.id is null then raise exception 'Shipment not found'; end if;
 if s.position=3 then raise exception 'Console is shipment 3: use exact Unit fulfillment, never a separate dispatch'; end if;
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||s.user_id::text,0));
 select * into s from initiation_shipments where id=p_shipment for update;
 if ((s.order_id is not null and exists(select 1 from initiation_entitlements where order_id=s.order_id and active)) or
 (s.position in (1,2) and s.legacy_order_id=public.eligible_legacy_initiation_order(s.user_id))) is not true then raise exception 'Active entitlement required'; end if;
 if not (p_status=s.status or (s.status='planned' and p_status='preparing') or (s.status='preparing' and p_status='dispatched') or (s.status='dispatched' and p_status='delivered')) then raise exception 'Invalid shipment transition'; end if;
 if p_status in ('dispatched','delivered') and coalesce(p_tracking,s.tracking_url,'') !~ '^https://[^/[:space:]]+' then raise exception 'Tracking URL required'; end if;
 if s.status in ('dispatched','delivered') and p_tracking is not null and p_tracking is distinct from s.tracking_url then raise exception 'Dispatched tracking is immutable'; end if;
 update initiation_shipments set status=p_status,tracking_url=coalesce(p_tracking,tracking_url) where id=p_shipment;
end $$;
revoke all on function public.eligible_legacy_initiation_order(uuid),public.ensure_legacy_initiation_packs(uuid),public.reserve_initiation(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.eligible_legacy_initiation_order(uuid),public.ensure_legacy_initiation_packs(uuid),public.reserve_initiation(uuid,text,text,text,text) to service_role;
create function public.initiation_access_state(p_user uuid) returns jsonb
language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'formal',exists(select 1 from initiation_members m where m.user_id=p_user and m.active and
 (m.source='granted' or exists(select 1 from initiation_entitlements e join initiation_orders o on o.id=e.order_id where e.user_id=p_user and e.order_id=m.order_id and e.active and o.status='paid'))),
 'legacy',public.eligible_legacy_initiation_order(p_user) is not null,
 'source',(select source from initiation_members where user_id=p_user),
 'refundOrDispute',exists(select 1 from initiation_orders where user_id=p_user and status in ('refunded','disputed','payment_review')) or
 exists(select 1 from voyager_orders o where o.user_id=p_user and o.product_type='voyager_pack' and (o.status='refunded' or exists(select 1 from initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent)))
 );
$$;
revoke all on function public.initiation_access_state(uuid) from public,anon,authenticated;
grant execute on function public.initiation_access_state(uuid) to service_role;
-- Once migrated, S26 Pack records are the single fulfillment channel. Preserve
-- old history/refunds, but prevent generic order/old-pack tools dispatching twice.
create function public.guard_legacy_initiation_fulfillment() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if new.product_type='voyager_pack' and exists(select 1 from initiation_shipments where legacy_order_id=new.id) and (
 (new.status in ('preparing','shipped','delivered') and old.status is distinct from new.status) or
 new.tracking_url is distinct from old.tracking_url or new.tracking_number is distinct from old.tracking_number or
 new.shipped_at is distinct from old.shipped_at or new.delivered_at is distinct from old.delivered_at)
 then raise exception 'Legacy Packs use the S26 first-two shipment records; duplicate legacy dispatch is blocked'; end if;
 return new;
end $$;
create trigger voyager_orders_legacy_initiation_fulfillment before update on public.voyager_orders
for each row execute function public.guard_legacy_initiation_fulfillment();
create function public.guard_legacy_device_pack_fulfillment() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if exists(select 1 from initiation_shipments where legacy_order_id=new.order_id) then
 raise exception 'Legacy Packs use the S26 first-two shipment records; duplicate old Pack writes are blocked'; end if;
 return new;
end $$;
create trigger device_order_packs_legacy_initiation_fulfillment before insert or update on public.device_order_packs
for each row execute function public.guard_legacy_device_pack_fulfillment();
revoke all on function public.guard_legacy_initiation_fulfillment(),public.guard_legacy_device_pack_fulfillment() from public,anon,authenticated;
-- Existing RPC ACLs are preserved by CREATE OR REPLACE.
commit;
