-- Device supply and single Console fulfillment. Requires v83/v85/v90 (v90 is applied before v88) and the existing
-- device Unit schema. Compatible with later legacy top-up payments: eligibility
-- comes from a paid Initiation order plus its active entitlement, never price/role.
-- No production batch is selected, no quantities changed, no shipments created.
begin;
alter table public.initiation_batches add column if not exists supply_revision integer not null default 0;
create table public.device_supply_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references public.voyager_profiles(id),
 membership_batch text not null references public.initiation_batches(label),
 previous_slug text, selected_slug text, revision integer not null,
 note text not null, created_at timestamptz not null default now()
);
alter table public.device_supply_audit enable row level security;
revoke all on public.device_supply_audit from public,anon,authenticated;
grant select,insert on public.device_supply_audit to service_role;
grant usage,select on sequence public.device_supply_audit_id_seq to service_role;

create function public.configure_device_supply(p_actor uuid,p_batch text,p_slug text,p_revision integer,p_note text) returns void
language plpgsql security invoker set search_path=public as $$
declare b initiation_batches; d device_batches;
begin
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human') then raise exception 'Human architect required'; end if;
 if length(trim(coalesce(p_note,''))) not between 10 and 1000 then raise exception 'Approval reference and supply review note required'; end if;
 select * into b from initiation_batches where label=p_batch for update;
 if b.label is null or b.supply_revision is distinct from p_revision then raise exception 'Supply configuration changed; reload before saving'; end if;
 if p_slug is not null then
  select * into d from device_batches where slug=p_slug for update;
  if d.id is null or d.publication_status<>'published' then raise exception 'Select a published equipment batch'; end if;
  if not exists(select 1 from device_batch_units where batch_slug=p_slug and sequence_no<=d.listing_quantity) then raise exception 'No registered physical Units in this batch'; end if;
 end if;
 if b.console_batch_slug is not distinct from p_slug then return; end if;
 update initiation_batches set console_batch_slug=p_slug,supply_revision=supply_revision+1 where label=p_batch;
 insert into device_supply_audit(actor_id,membership_batch,previous_slug,selected_slug,revision,note)
 values(p_actor,p_batch,b.console_batch_slug,p_slug,b.supply_revision+1,trim(p_note));
end $$;

-- A public equipment-state reader, with no user identities or membership counts.
create function public.device_claim_supply(p_slug text) returns jsonb
language sql stable security invoker set search_path=public as $$
 select case when not exists(select 1 from initiation_batches i join device_batches d on d.slug=i.console_batch_slug where i.label='S26' and d.slug=p_slug and d.publication_status='published')
 then jsonb_build_object('status','unconfigured')
 else (select jsonb_build_object('status',case when d.claimed_quantity+d.reserved_quantity>=d.listing_quantity or not exists(select 1 from device_batch_units u where u.batch_slug=d.slug and u.sequence_no<=d.listing_quantity and u.status='available' and u.order_id is null and u.user_id is null) then 'full' else 'available' end)
 from device_batches d where d.slug=p_slug) end;
$$;

-- Shared predicate for the permission layer; payment/role alone cannot be a holder.
create function public.has_bound_console(p_user uuid) returns boolean
language sql stable security invoker set search_path=public as $$
 select exists(select 1 from devices where current_user_id=p_user) or exists(select 1 from device_batch_units u join voyager_orders o on o.id=u.order_id and o.user_id=u.user_id and o.device_batch_slug=u.batch_slug
 where u.user_id=p_user and u.status in ('assigned','preparing','shipped','delivered') and o.status in ('paid','preparing','shipped','delivered')
 and (o.product_type='device_batch_claim' or (o.product_type='initiation_console_claim' and exists(
 select 1 from initiation_entitlements e join initiation_orders io on io.id=e.order_id and io.user_id=e.user_id and io.status='paid'
 where e.user_id=p_user and e.active and e.console_order_id=o.id and e.console_claimed_at is not null))));
$$;

create or replace function public.claim_initiation_console(p_user uuid,p_batch text default null) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare e initiation_entitlements; ib initiation_batches; b device_batches; u device_batch_units; io initiation_orders; existing voyager_orders; oid uuid; s initiation_shipments;
begin
 -- Match payment/configuration lock order, then entitlement and equipment.
 select * into ib from initiation_batches where label='S26' for update;
 select o.* into io from initiation_orders o join initiation_entitlements x on x.order_id=o.id where x.user_id=p_user for update of o;
 select * into e from initiation_entitlements where user_id=p_user for update;
 if e.user_id is null or not e.active or io.status is distinct from 'paid' or io.user_id is distinct from p_user then raise exception using errcode='P1001',message='Active paid entitlement required'; end if;
 if e.console_order_id is not null then
  select * into existing from voyager_orders where id=e.console_order_id and user_id=p_user and product_type='initiation_console_claim';
  select * into u from device_batch_units where order_id=e.console_order_id and user_id=p_user;
  if existing.id is null or existing.status not in ('paid','preparing','shipped','delivered') or e.console_claimed_at is null or u.id is null or existing.device_batch_slug is distinct from u.batch_slug or u.status not in ('assigned','preparing','shipped','delivered') then raise exception using errcode='P1003',message='Existing binding requires reconciliation'; end if;
  if p_batch is not null and p_batch<>u.batch_slug then raise exception using errcode='P1003',message='Console already assigned in another batch'; end if;
  return jsonb_build_object('orderId',e.console_order_id,'unitCode',u.unit_code,'already',true);
 end if;
 if e.console_claimed_at is not null then raise exception using errcode='P1003',message='Claim timestamp lacks order binding'; end if;
 select * into b from device_batches where slug=ib.console_batch_slug for update;
 if b.id is null or b.publication_status<>'published' or (p_batch is not null and p_batch<>b.slug) then raise exception using errcode='P1003',message='Selected equipment supply is not configured'; end if;
 if b.claimed_quantity+b.reserved_quantity>=b.listing_quantity then raise exception using errcode='P1002',message='Equipment capacity exhausted'; end if;
 select * into s from initiation_shipments where order_id=e.order_id and user_id=p_user and position=3 for update;
 if s.id is null or s.status not in ('planned','preparing') then raise exception using errcode='P1003',message='Third shipment requires reconciliation before allocation'; end if;
 if nullif(trim(io.shipping->>'name'),'') is null or nullif(trim(io.shipping->'address'->>'line1'),'') is null or nullif(trim(io.shipping->'address'->>'country'),'') is null then raise exception using errcode='P1003',message='Confirmed checkout shipping address required'; end if;
 select * into u from device_batch_units where batch_slug=b.slug and sequence_no<=b.listing_quantity and status='available' and order_id is null and user_id is null order by sequence_no limit 1 for update skip locked;
 if u.id is null then raise exception using errcode='P1002',message='Equipment capacity exhausted'; end if;
 insert into voyager_orders(user_id,product_type,status,amount,currency,batch_label,device_batch_slug,device_batch_code,pack_count,recipient_name,address_line1,address_line2,city,state,postal_code,country)
 values(p_user,'initiation_console_claim',case when s.status='preparing' then 'preparing' else 'paid' end,0,'usd',e.batch,b.slug,b.code,0,
 io.shipping->>'name',io.shipping->'address'->>'line1',io.shipping->'address'->>'line2',io.shipping->'address'->>'city',io.shipping->'address'->>'state',io.shipping->'address'->>'postal_code',io.shipping->'address'->>'country') returning id into oid;
 update device_batch_units set status=case when s.status='preparing' then 'preparing' else 'assigned' end,order_id=oid,user_id=p_user,assigned_at=now(),updated_at=now() where id=u.id;
 update device_batches set claimed_quantity=claimed_quantity+1,updated_at=now() where id=b.id;
 update initiation_entitlements set console_claimed_at=now(),console_order_id=oid where user_id=p_user;
 -- No device_order_packs row: position 3 in initiation_shipments IS this shipment.
 return jsonb_build_object('orderId',oid,'unitCode',u.unit_code,'already',false);
end $$;

create or replace function public.fulfill_initiation_console(p_actor uuid,p_order uuid,p_status text,p_unit text,p_tracking text) returns void
language plpgsql security invoker set search_path=public as $$
declare e initiation_entitlements; io initiation_orders; o voyager_orders; u device_batch_units; s initiation_shipments; target_status text; expected_status text; tracking text;
begin
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human') then raise exception 'Human architect required'; end if;
 select x.* into io from initiation_orders x join initiation_entitlements t on t.order_id=x.id where t.console_order_id=p_order for update of x;
 select * into e from initiation_entitlements where console_order_id=p_order for update;
 if e.user_id is null or not e.active or io.status is distinct from 'paid' then raise exception 'Active paid entitlement required'; end if;
 select * into o from voyager_orders where id=p_order and product_type='initiation_console_claim' and user_id=e.user_id for update;
 select * into s from initiation_shipments where order_id=e.order_id and user_id=e.user_id and position=3 for update;
 select * into u from device_batch_units where order_id=p_order and user_id=e.user_id for update;
 if o.id is null or s.id is null or u.id is null or u.unit_code is distinct from p_unit or u.batch_slug is distinct from o.device_batch_slug then raise exception 'Verify the exact bound Console Unit'; end if;
 expected_status:=case o.status when 'paid' then 'planned' when 'shipped' then 'dispatched' else o.status end;
 if s.status is distinct from expected_status or u.status is distinct from (case when o.status='paid' then 'assigned' else o.status end) then raise exception 'Shipment and Console disagree; reconcile before dispatch'; end if;
 if not (p_status=o.status or (o.status='paid' and p_status='preparing') or (o.status='preparing' and p_status='shipped') or (o.status='shipped' and p_status='delivered')) then raise exception 'Invalid Console transition'; end if;
 tracking:=coalesce(nullif(trim(p_tracking),''),s.tracking_url,o.tracking_url);
 if p_status in ('shipped','delivered') and (tracking is null or tracking !~ '^https://[^/[:space:]]+') then raise exception 'Tracking URL required'; end if;
 if o.status in ('shipped','delivered') and (s.tracking_url is distinct from o.tracking_url or tracking is distinct from o.tracking_url) then raise exception 'Dispatched tracking is immutable; reconcile with support'; end if;
 target_status:=case p_status when 'paid' then 'planned' when 'shipped' then 'dispatched' else p_status end;
 update initiation_shipments set status=target_status,tracking_url=tracking where id=s.id;
 update voyager_orders set status=p_status,tracking_url=tracking,shipped_at=case when p_status='shipped' then coalesce(shipped_at,now()) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,now()) else delivered_at end where id=p_order;
 update device_batch_units set status=case when p_status='paid' then 'assigned' else p_status end,
 shipping_verified_at=case when p_status='shipped' then coalesce(shipping_verified_at,now()) else shipping_verified_at end,
 shipping_verified_by=case when p_status='shipped' then coalesce(shipping_verified_by,p_actor) else shipping_verified_by end,
 shipped_at=case when p_status='shipped' then coalesce(shipped_at,now()) else shipped_at end,
 delivered_at=case when p_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,updated_at=now() where id=u.id;
end $$;

-- v90 owns generic/legacy Pack fulfillment and blocks position 3. Do not replace it here.

revoke all on function public.configure_device_supply(uuid,text,text,integer,text),public.device_claim_supply(text),public.has_bound_console(uuid) from public,anon,authenticated;
grant execute on function public.configure_device_supply(uuid,text,text,integer,text),public.device_claim_supply(text),public.has_bound_console(uuid) to service_role;
revoke all on function public.claim_initiation_console(uuid,text),public.fulfill_initiation_shipment(uuid,uuid,text,text),public.fulfill_initiation_console(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_initiation_console(uuid,text),public.fulfill_initiation_shipment(uuid,uuid,text,text),public.fulfill_initiation_console(uuid,uuid,text,text,text) to service_role;
commit;
