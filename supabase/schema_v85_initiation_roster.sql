-- Initiation member roster, including explicitly granted NPC members.
-- Requires v83. v84 is reserved for NPC administration; no dependency on it.
-- Does not seed identities or create payments. Register approved members separately.
begin;
create table public.initiation_members (
 user_id uuid primary key references public.voyager_profiles(id),
 batch text not null default 'S26' references public.initiation_batches(label),
 source text not null check(source in ('paid','granted')),
 order_id uuid unique references public.initiation_orders(id),
 active boolean not null default true,
 grant_note text,
 created_at timestamptz not null default now(),
 check((source='paid' and order_id is not null and grant_note is null) or (source='granted' and order_id is null and grant_note is not null and length(trim(grant_note))>0))
);
alter table public.initiation_members enable row level security;
revoke all on public.initiation_members from public,anon,authenticated;
grant all on public.initiation_members to service_role;
create index initiation_members_batch_idx on public.initiation_members(batch);
-- Existing verified paid entitlements only; never infer payment from profile role.
insert into public.initiation_members(user_id,batch,source,order_id,active)
 select e.user_id,e.batch,'paid',e.order_id,e.active from public.initiation_entitlements e
 join public.initiation_orders o on o.id=e.order_id and o.user_id=e.user_id;

-- A paid roster member and its order occupy ONE seat, not two. Revocations and
-- refunds retain their seat for manual review. Expired/canceled attempts do not.
create function public.initiation_occupied_seats() returns bigint
language sql stable security invoker set search_path=public as $$
 select (select count(*) from initiation_members where batch='S26') +
 (select count(*) from initiation_orders o where o.batch='S26'
 and o.status in ('pending','paid','payment_review','disputed','refunded')
 and not exists(select 1 from initiation_members m where m.order_id=o.id));
$$;
create or replace function public.initiation_availability() returns jsonb
language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('open',b.checkout_open,'capacity',b.capacity,
 'initiated',(select count(*) from initiation_members where batch=b.label and active),
 'paid',(select count(*) from initiation_members where batch=b.label and active and source='paid'),
 'granted',(select count(*) from initiation_members where batch=b.label and active and source='granted'),
 'remaining',b.capacity-public.initiation_occupied_seats())
 from initiation_batches b where label='S26';
$$;

create function public.grant_initiation_member(p_user uuid,p_note text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare b initiation_batches; person voyager_profiles; existing initiation_members;
begin
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null then raise exception 'Initiation batch is unavailable'; end if;
 select * into person from voyager_profiles where id=p_user for update;
 if person.id is null or person.batch_label is distinct from 'S26' or person.member_source is distinct from 'granted' or person.role not in ('voyager','architect') then raise exception 'Explicit S26 granted member profile required'; end if;
 if p_note is null or length(trim(p_note)) not between 1 and 1000 then raise exception 'Grant audit note required'; end if;
 select * into existing from initiation_members where user_id=p_user;
 if existing.user_id is not null then
  if existing.source <> 'granted' or existing.batch <> 'S26' then raise exception 'Existing membership source mismatch'; end if;
  return jsonb_build_object('already',true,'source',existing.source,'active',existing.active);
 end if;
 if exists(select 1 from initiation_orders where user_id=p_user and status in ('pending','paid','payment_review','disputed','refunded')) then raise exception 'Existing payment requires reconciliation before grant'; end if;
 if public.initiation_occupied_seats() >= b.capacity then raise exception 'S26 capacity exhausted'; end if;
 insert into initiation_members(user_id,source,grant_note) values(p_user,'granted',trim(p_note));
 -- No payment, shipping entitlement, role mutation or login capability is created.
 return jsonb_build_object('already',false,'source','granted','active',true);
end $$;

create or replace function public.reserve_initiation(p_user uuid,p_price text,p_product text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare b initiation_batches; o initiation_orders;
begin
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null or not b.checkout_open then raise exception 'Initiation checkout is closed'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'Only human accounts may start a payment'; end if;
 if exists(select 1 from initiation_members where user_id=p_user) then raise exception 'An Initiation membership already exists'; end if;
 if not exists(select 1 from voyager_intake where user_id=p_user and version='voyager-profile-v1') then raise exception 'Calibration required'; end if;
 if exists(select 1 from voyager_orders where user_id=p_user and product_type='voyager_pack' and stripe_session_id like 'cs_%' and amount>0 and paid_at is not null and status in ('paid','preparing','shipped','delivered')) then raise exception 'Legacy upgrade policy is pending'; end if;
 if exists(select 1 from initiation_entitlements where user_id=p_user) then raise exception 'An Initiation record already exists; contact support'; end if;
 select * into o from initiation_orders where user_id=p_user and status in ('pending','paid','payment_review','disputed');
 if o.id is not null then
  if o.status <> 'pending' then raise exception 'Payment already recorded or under review'; end if;
  return to_jsonb(o);
 end if;
 if public.initiation_occupied_seats() >= b.capacity then raise exception 'S26 seats are fully reserved'; end if;
 insert into initiation_orders(user_id,price_id,product_id) values(p_user,p_price,p_product) returning * into o;
 return to_jsonb(o);
end $$;

create or replace function public.complete_initiation(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare o initiation_orders; hold_reason text; b initiation_batches;
begin
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.id is null or o.user_id <> p_user or (o.stripe_session_id is not null and o.stripe_session_id <> p_session) then raise exception 'Payment binding mismatch'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'NPC payment cannot activate membership'; end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 -- The pending order already occupies one seat; replacing it by the roster is neutral.
 if b.label is null or public.initiation_occupied_seats() > b.capacity then raise exception 'Capacity requires reconciliation'; end if;
 if exists(select 1 from initiation_members where user_id=p_user) then raise exception 'Existing membership requires reconciliation'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
 if hold_reason is not null then return; end if;
 insert into initiation_members(user_id,batch,source,order_id) values(o.user_id,o.batch,'paid',o.id);
 insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id);
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select o.user_id,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) s(n,month);
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=o.user_id;
end $$;
create or replace function public.hold_initiation_payment(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public as $$
begin
 if p_reason not in ('refunded','disputed') then raise exception 'Invalid payment hold'; end if;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 insert into initiation_payment_holds(payment_intent,reason) values(p_intent,p_reason)
 on conflict(payment_intent) do update set reason=case when initiation_payment_holds.reason='refunded' then 'refunded' else excluded.reason end;
 update initiation_orders set status=(select reason from initiation_payment_holds where payment_intent=p_intent) where stripe_payment_intent=p_intent;
 update initiation_entitlements set active=false where order_id in(select id from initiation_orders where stripe_payment_intent=p_intent);
 update initiation_members set active=false where source='paid' and order_id in(select id from initiation_orders where stripe_payment_intent=p_intent);
end $$;
revoke all on function public.initiation_occupied_seats(),public.grant_initiation_member(uuid,text) from public,anon,authenticated;
grant execute on function public.initiation_occupied_seats(),public.grant_initiation_member(uuid,text) to service_role;
-- CREATE OR REPLACE preserves existing ACLs; state the boundary explicitly.
revoke all on function public.initiation_availability(),public.reserve_initiation(uuid,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment(text,text) from public,anon,authenticated;
grant execute on function public.initiation_availability(),public.reserve_initiation(uuid,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment(text,text) to service_role;
commit;
