-- Signal Calibration follows payment; reserving a seat does not require the quiz.
-- NOT APPLIED to production. Requires schema_v103; apply before deploying the app.
-- Pricing, inventory locks, duplicate-order guards and service-role-only access stay intact.
begin;

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

revoke all on function public.reserve_initiation_v2(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_initiation_v2(uuid,text,text,text,text) to service_role;

commit;
