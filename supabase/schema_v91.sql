-- S26 grants a single claim; the member chooses any published device batch.
-- Requires v90, v88, v89. No existing orders, inventory or batch mappings are changed.
begin;
create or replace function public.device_claim_supply(p_slug text) returns jsonb
language sql stable security invoker set search_path=public as $$
 select coalesce((select jsonb_build_object('status',case
 when d.claimed_quantity+d.reserved_quantity>=d.listing_quantity or not exists(
 select 1 from device_batch_units u where u.batch_slug=d.slug and u.sequence_no<=d.listing_quantity
 and u.status='available' and u.order_id is null and u.user_id is null) then 'full' else 'available' end)
 from device_batches d where d.slug=p_slug and d.publication_status='published'),jsonb_build_object('status','unconfigured'));
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
 select * into b from device_batches where slug=p_batch for update;
 if b.id is null or b.publication_status<>'published' then raise exception using errcode='P1003',message='Choose a published equipment batch'; end if;
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


-- Retire the old administrative mapping write; historical audit rows remain intact.
revoke all on function public.configure_device_supply(uuid,text,text,integer,text) from public,anon,authenticated,service_role;
revoke all on function public.device_claim_supply(text),public.claim_initiation_console(uuid,text) from public,anon,authenticated;
grant execute on function public.device_claim_supply(text),public.claim_initiation_console(uuid,text) to service_role;
commit;
