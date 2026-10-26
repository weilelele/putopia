begin;
alter table public.initiation_members add column legacy_order_id uuid unique references public.voyager_orders(id);
alter table public.initiation_members drop constraint initiation_members_check;
alter table public.initiation_members add constraint initiation_members_check check(
 (source='paid' and num_nonnulls(order_id,legacy_order_id)=1 and grant_note is null) or
 (source='granted' and order_id is null and legacy_order_id is null and grant_note is not null and length(trim(grant_note))>0)
);

create function public.sync_legacy_initiation_member(p_user uuid) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare legacy_id uuid; existing initiation_members; joined timestamptz;
begin
 perform 1 from initiation_batches where label='S26' for update;
 legacy_id:=public.eligible_legacy_initiation_order(p_user);
 select * into existing from initiation_members where user_id=p_user for update;
 if legacy_id is null then
  update initiation_members set active=false where user_id=p_user and legacy_order_id is not null;
  return;
 end if;
 if existing.user_id is not null and existing.batch<>'S26' then raise exception 'Historical membership batch requires reconciliation'; end if;
 insert into initiation_members(user_id,batch,source,legacy_order_id,created_at)
 select p_user,'S26','paid',legacy_id,paid_at from voyager_orders where id=legacy_id
 on conflict(user_id) do update set source='paid',order_id=null,legacy_order_id=excluded.legacy_order_id,grant_note=null,active=true
 where initiation_members.legacy_order_id is not null or not initiation_members.active;
 if public.initiation_occupied_seats()>(select capacity from initiation_batches where label='S26') then
  raise exception 'Historical S26 membership exceeds capacity; reconcile before applying';
 end if;
 select paid_at into joined from voyager_orders where id=legacy_id;
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,joined),batch_label='S26' where id=p_user;
end $$;

create function public.sync_legacy_initiation_order_member() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.product_type is distinct from 'voyager_pack' and
 (tg_op='INSERT' or old.product_type is distinct from 'voyager_pack') then return new; end if;
 if tg_op='UPDATE' and old.user_id is distinct from new.user_id then
  perform public.sync_legacy_initiation_member(old.user_id);
 end if;
 perform public.sync_legacy_initiation_member(new.user_id);
 return new;
end $$;
create trigger voyager_orders_legacy_s26_member after insert or update of user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent on public.voyager_orders
for each row execute function public.sync_legacy_initiation_order_member();

create function public.sync_legacy_initiation_hold_member() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare owner_id uuid;
begin
 for owner_id in select distinct user_id from voyager_orders
 where product_type='voyager_pack' and stripe_payment_intent=new.payment_intent
 loop perform public.sync_legacy_initiation_member(owner_id); end loop;
 return new;
end $$;
create trigger initiation_holds_legacy_s26_member after insert or update on public.initiation_payment_holds
for each row execute function public.sync_legacy_initiation_hold_member();

create or replace function public.reserve_initiation_v2(p_user uuid,p_price text,p_product text,p_kind text,p_device_source text default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; old_id uuid; initial_id uuid; owns_seat boolean;
begin
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null or not b.checkout_open then raise exception 'Initiation checkout is closed'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'Only human accounts may start a payment'; end if;
 if exists(select 1 from initiation_entitlements where user_id=p_user) then raise exception 'Existing Console entitlement requires reconciliation'; end if;
 if p_price !~ '^price_' or p_product !~ '^prod_' then raise exception 'Dedicated bundle price required'; end if;
 old_id:=public.eligible_legacy_initiation_order(p_user);
 initial_id:=public.eligible_initial_initiation_order(p_user);
 if p_kind not in ('initial','standard','legacy_upgrade') or p_kind is null then raise exception 'Invalid bundle'; end if;
 if (old_id is not null or initial_id is not null) <> (p_kind='legacy_upgrade') then raise exception 'Price eligibility changed; refresh checkout'; end if;
 if old_id is null and initial_id is null and exists(select 1 from initiation_shipments where user_id=p_user) then raise exception 'Existing fulfillment requires reconciliation'; end if;
 if exists(select 1 from initiation_members where user_id=p_user) and initial_id is null
 and not exists(select 1 from initiation_members where user_id=p_user and batch='S26' and source='paid'
 and active and legacy_order_id=old_id) then raise exception 'Existing membership requires reconciliation'; end if;
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

create or replace function public.complete_initiation_pre_bundles(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
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
 if exists(select 1 from initiation_members where user_id=p_user and not
 (batch='S26' and source='paid' and legacy_order_id=o.legacy_order_id and o.order_kind='legacy_upgrade'))
 then raise exception 'Existing membership requires reconciliation'; end if;
 if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')='' or coalesce(trim(p_shipping->'address'->>'country'),'') !~ '^[A-Z]{2}$' then raise exception 'Verified Stripe shipping address required'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
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
 insert into initiation_members(user_id,batch,source,order_id) values(o.user_id,o.batch,'paid',o.id)
 on conflict(user_id) do update set order_id=excluded.order_id,legacy_order_id=null,active=true;
 insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id);
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select o.user_id,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) s(n,month)
 where o.order_kind='standard' or n>2
 on conflict(user_id,position) do update set order_id=excluded.order_id
 where initiation_shipments.order_id is null;
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=o.user_id;
end $$;

alter function public.hold_initiation_payment_v90(text,text) rename to hold_initiation_payment_pre_legacy_members;
create function public.hold_initiation_payment_v90(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare owner_id uuid;
begin
 perform public.hold_initiation_payment_pre_legacy_members(p_intent,p_reason);
 for owner_id in select user_id from voyager_orders
 where product_type='voyager_pack' and stripe_payment_intent=p_intent
 union select user_id from initiation_orders where stripe_payment_intent=p_intent
 loop perform public.sync_legacy_initiation_member(owner_id); end loop;
end $$;

alter function public.initiation_access_state(uuid) rename to initiation_access_state_pre_legacy_members;
create function public.initiation_access_state(p_user uuid) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select public.initiation_access_state_pre_legacy_members(p_user) || jsonb_build_object(
 'formal',(public.initiation_access_state_pre_legacy_members(p_user)->>'formal')::boolean
 or exists(select 1 from initiation_members m where m.user_id=p_user and m.batch='S26' and m.active
 and m.legacy_order_id=public.eligible_legacy_initiation_order(p_user)));
$$;

do $$
declare owner_id uuid;
begin
 perform 1 from initiation_batches where label='S26' for update;
 for owner_id in select distinct o.user_id from voyager_orders o
 where o.id=public.eligible_legacy_initiation_order(o.user_id)
 order by o.user_id
 loop perform public.sync_legacy_initiation_member(owner_id); end loop;
end $$;

revoke all on function public.sync_legacy_initiation_member(uuid),public.sync_legacy_initiation_order_member(),public.sync_legacy_initiation_hold_member(),public.hold_initiation_payment_v90(text,text),public.initiation_access_state(uuid) from public,anon,authenticated;
grant execute on function public.sync_legacy_initiation_member(uuid),public.hold_initiation_payment_v90(text,text),public.initiation_access_state(uuid) to service_role;
commit;
