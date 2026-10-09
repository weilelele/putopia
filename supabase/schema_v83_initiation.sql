-- S26 Initiation. Requires schema_v82. NOT applied to production.
-- No backfill from role, NPCs, gifts, or legacy orders. All APIs service-role only.
begin;
-- Console allocation is an entitlement record, not another paid Pack.
alter table public.voyager_orders drop constraint voyager_orders_pack_count_positive;
alter table public.voyager_orders add constraint voyager_orders_pack_count_positive
 check(pack_count > 0 or (product_type='initiation_console_claim' and pack_count=0));
create table public.initiation_batches (
  label text primary key check(label='S26'), capacity integer not null check(capacity=100),
  checkout_open boolean not null default false,
  console_batch_slug text references public.device_batches(slug)
);
insert into public.initiation_batches(label,capacity) values('S26',100);
create table public.initiation_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.voyager_profiles(id),
  batch text not null references public.initiation_batches(label) default 'S26',
  product_type text not null default 'voyager_initiation' check(product_type='voyager_initiation'),
  amount integer not null default 52000 check(amount=52000), currency text not null default 'usd' check(currency='usd'),
  price_id text not null, product_id text not null,
  status text not null default 'pending' check(status in ('pending','paid','canceled','payment_failed','payment_review','refunded','disputed')),
  stripe_session_id text unique, stripe_payment_intent text unique,
  expires_at timestamptz not null default now()+interval '35 minutes',
  paid_at timestamptz, shipping jsonb, created_at timestamptz not null default now()
);
create unique index initiation_one_open_order on public.initiation_orders(user_id)
where status in ('pending','paid','payment_review','disputed');
create table public.initiation_entitlements (
  user_id uuid primary key references public.voyager_profiles(id),
  order_id uuid not null unique references public.initiation_orders(id),
  batch text not null default 'S26' references public.initiation_batches(label),
  active boolean not null default true,
  console_claimed_at timestamptz,
  console_order_id uuid unique references public.voyager_orders(id)
);
create table public.initiation_shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.voyager_profiles(id),
  order_id uuid not null references public.initiation_orders(id),
  position integer not null check(position between 1 and 4), title text not null,
  scheduled_month text not null,
  status text not null default 'planned' check(status in ('planned','preparing','dispatched','delivered')),
  tracking_url text check(tracking_url is null or tracking_url ~ '^https://'),
  unique(order_id,position)
);
-- Signed payment reversals may arrive before checkout completion. This durable
-- ledger prevents late success events from resurrecting refunded/disputed access.
create table public.initiation_payment_holds (
  payment_intent text primary key,
  reason text not null check(reason in ('refunded','disputed')),
  created_at timestamptz not null default now()
);
alter table public.initiation_batches enable row level security;
alter table public.initiation_orders enable row level security;
alter table public.initiation_entitlements enable row level security;
alter table public.initiation_shipments enable row level security;
alter table public.initiation_payment_holds enable row level security;
revoke all on public.initiation_batches,public.initiation_orders,public.initiation_entitlements,public.initiation_shipments,public.initiation_payment_holds from public,anon,authenticated;
grant all on public.initiation_batches,public.initiation_orders,public.initiation_entitlements,public.initiation_shipments,public.initiation_payment_holds to service_role;

create function public.initiation_availability() returns jsonb
language sql security invoker set search_path=public as $$
 select jsonb_build_object('open',b.checkout_open,'initiated',
   (select count(*) from initiation_orders where status='paid'),
   'remaining',b.capacity-(select count(*) from initiation_orders where status in ('pending','paid','payment_review','disputed','refunded')))
 from initiation_batches b where label='S26';
$$;

create function public.reserve_initiation(p_user uuid,p_price text,p_product text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare b initiation_batches; o initiation_orders;
begin
 select * into b from initiation_batches where label='S26' for update;
 if not b.checkout_open then raise exception 'Initiation checkout is closed'; end if;
 if not exists(select 1 from voyager_intake where user_id=p_user and version='voyager-profile-v1') then raise exception 'Calibration required'; end if;
 if exists(select 1 from voyager_orders where user_id=p_user and product_type='voyager_pack' and stripe_session_id like 'cs_%' and amount > 0 and paid_at is not null and status in ('paid','preparing','shipped','delivered')) then raise exception 'Legacy upgrade policy is pending'; end if;
 if exists(select 1 from initiation_entitlements where user_id=p_user) then raise exception 'An Initiation record already exists; contact support'; end if;
 select * into o from initiation_orders where user_id=p_user and status in ('pending','paid','payment_review','disputed');
 if o.id is not null then
   if o.status <> 'pending' then raise exception 'Payment already recorded or under review'; end if;
   return to_jsonb(o);
 end if;
 -- A wall-clock expiry alone never releases a Stripe session that might be paid.
 if (select count(*) from initiation_orders where status in ('pending','paid','payment_review','disputed','refunded')) >= b.capacity then raise exception 'S26 seats are fully reserved'; end if;
 insert into initiation_orders(user_id,price_id,product_id) values(p_user,p_price,p_product) returning * into o;
 return to_jsonb(o);
end $$;

create function public.complete_initiation(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare o initiation_orders; hold_reason text;
begin
 -- Serialize completion/reversal even when a reversal arrived before this order.
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.id is null or o.user_id <> p_user or (o.stripe_session_id is not null and o.stripe_session_id <> p_session) then raise exception 'Payment binding mismatch'; end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
 if hold_reason is not null then return; end if;
 insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id);
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select o.user_id,o.id,n,'Initiation Pack '||n,month from (values(1,'2026-10'),(2,'2026-11'),(3,'2026-12'),(4,'2027-01')) s(n,month);
 -- Explicit S26 assignment; never the mutable current batch or NPC classification.
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=o.user_id;
end $$;

create function public.hold_initiation_payment(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public as $$
begin
 if p_reason not in ('refunded','disputed') then raise exception 'Invalid payment hold'; end if;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 insert into initiation_payment_holds(payment_intent,reason) values(p_intent,p_reason)
 on conflict(payment_intent) do update set reason=case when initiation_payment_holds.reason='refunded' then 'refunded' else excluded.reason end;
 update initiation_orders set status=(select reason from initiation_payment_holds where payment_intent=p_intent) where stripe_payment_intent=p_intent;
 update initiation_entitlements set active=false where order_id in(select id from initiation_orders where stripe_payment_intent=p_intent);
 -- Keep shipments, physical claims and membership history for manual review.
 -- Refunded/disputed seats are not automatically resold.
end $$;

revoke all on function public.initiation_availability(),public.reserve_initiation(uuid,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment(text,text) from public,anon,authenticated;
grant execute on function public.initiation_availability(),public.reserve_initiation(uuid,text,text),public.complete_initiation(uuid,text,uuid,text,jsonb),public.hold_initiation_payment(text,text) to service_role;
-- Console supply is configured separately from the 100 membership seats.
-- This claim uses the real unit pool, never creates another payment or old Packs.
create function public.claim_initiation_console(p_user uuid,p_batch text default null) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare e initiation_entitlements; b device_batches; u device_batch_units; oid uuid; delivery jsonb;
begin
 select * into e from initiation_entitlements where user_id=p_user for update;
 if e.user_id is null or not e.active then raise exception using errcode='P1001',message='Active Initiation entitlement required'; end if;
 if e.console_order_id is not null then return jsonb_build_object('orderId',e.console_order_id,'already',true); end if;
 select d.* into b from device_batches d join initiation_batches i on i.console_batch_slug=d.slug where i.label=e.batch for update of d;
 if b.id is null or b.publication_status <> 'published' then raise exception 'Console allocation is not available yet'; end if;
 if p_batch is not null and p_batch <> b.slug then raise exception using errcode='P1003',message='Requested batch does not match entitlement supply'; end if;
 if b.claimed_quantity+b.reserved_quantity >= b.listing_quantity then raise exception using errcode='P1002',message='No Console units are available'; end if;
 select * into u from device_batch_units where batch_slug=b.slug and status='available' and order_id is null order by sequence_no limit 1 for update skip locked;
 if u.id is null then raise exception using errcode='P1002',message='No Console units are available'; end if;
 select shipping into delivery from initiation_orders where id=e.order_id and status='paid';
 if delivery is null then raise exception 'Confirmed delivery details required'; end if;
 insert into voyager_orders(user_id,product_type,status,amount,currency,batch_label,device_batch_slug,device_batch_code,pack_count,recipient_name,address_line1,address_line2,city,state,postal_code,country)
 values(p_user,'initiation_console_claim','paid',0,'usd','S26',b.slug,b.code,0,
 delivery->>'name',delivery->'address'->>'line1',delivery->'address'->>'line2',delivery->'address'->>'city',delivery->'address'->>'state',delivery->'address'->>'postal_code',coalesce(delivery->'address'->>'country','')) returning id into oid;
 update device_batch_units set status='assigned',order_id=oid,user_id=p_user,assigned_at=now(),updated_at=now() where id=u.id;
 update device_batches set claimed_quantity=claimed_quantity+1,updated_at=now() where id=b.id;
 update initiation_entitlements set console_claimed_at=now(),console_order_id=oid where user_id=p_user;
 return jsonb_build_object('orderId',oid,'unitCode',u.unit_code,'already',false);
end $$;
revoke all on function public.claim_initiation_console(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_initiation_console(uuid,text) to service_role;
create function public.fulfill_initiation_shipment(p_actor uuid,p_shipment uuid,p_status text,p_tracking text) returns void
language plpgsql security invoker set search_path=public as $$
declare s initiation_shipments;
begin
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect') then raise exception 'Forbidden'; end if;
 select * into s from initiation_shipments where id=p_shipment;
 if s.id is null then raise exception 'Shipment not found'; end if;
 perform 1 from initiation_entitlements where order_id=s.order_id and active for update;
 if not found then raise exception 'Active entitlement required'; end if;
 select * into s from initiation_shipments where id=p_shipment for update;
 if not (p_status=s.status or (s.status='planned' and p_status='preparing') or (s.status='preparing' and p_status='dispatched') or (s.status='dispatched' and p_status='delivered')) then raise exception 'Invalid shipment transition'; end if;
 if p_status in ('dispatched','delivered') and coalesce(p_tracking,s.tracking_url,'') !~ '^https://' then raise exception 'Tracking URL required'; end if;
 update initiation_shipments set status=p_status,tracking_url=coalesce(p_tracking,tracking_url) where id=p_shipment;
end $$;
create function public.fulfill_initiation_console(p_actor uuid,p_order uuid,p_status text,p_unit text,p_tracking text) returns void
language plpgsql security invoker set search_path=public as $$
declare o voyager_orders; u device_batch_units;
begin
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect') then raise exception 'Forbidden'; end if;
 -- Match the claim lock order: entitlement, order, then the physical Unit.
 perform 1 from initiation_entitlements where console_order_id=p_order and active for update;
 if not found then raise exception 'Active entitlement required'; end if;
 select * into o from voyager_orders where id=p_order and product_type='initiation_console_claim' for update;
 if o.id is null then raise exception 'Console claim not found'; end if;
 select * into u from device_batch_units where order_id=p_order for update;
 if not (p_status=o.status or (o.status='paid' and p_status='preparing') or (o.status='preparing' and p_status='shipped') or (o.status='shipped' and p_status='delivered')) then raise exception 'Invalid Console transition'; end if;
 if p_status in ('shipped','delivered') and (u.unit_code is distinct from p_unit or coalesce(p_tracking,o.tracking_url,'') !~ '^https://') then raise exception 'Verify the exact Unit and tracking URL'; end if;
 update voyager_orders set status=p_status,tracking_url=coalesce(p_tracking,tracking_url),shipped_at=case when p_status='shipped' then coalesce(shipped_at,now()) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,now()) else delivered_at end where id=p_order;
 update device_batch_units set status=case when p_status='paid' then 'assigned' else p_status end,shipping_verified_at=case when p_status='shipped' then coalesce(shipping_verified_at,now()) else shipping_verified_at end,shipping_verified_by=case when p_status='shipped' then p_actor else shipping_verified_by end,updated_at=now() where id=u.id;
end $$;
revoke all on function public.fulfill_initiation_shipment(uuid,uuid,text,text),public.fulfill_initiation_console(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_initiation_shipment(uuid,uuid,text,text),public.fulfill_initiation_console(uuid,uuid,text,text,text) to service_role;
commit;
