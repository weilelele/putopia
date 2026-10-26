-- Rollback for schema_v106 (guest purchase claims).
-- Refuses to run once any order has been claimed: those orders need purchased_by
-- for their Stripe binding checks, so reverse them by hand first.
begin;

do $$
begin
 if exists(select 1 from public.initiation_orders where purchased_by is not null) then
  raise exception 'Claimed guest orders exist; reconcile them before rolling back';
 end if;
end $$;

drop function if exists public.transfer_guest_initiation(uuid,uuid);

-- schema_v103 definition.
create or replace function public.guard_initiation_quote() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if row(new.user_id,new.order_kind,new.amount,new.currency,new.price_id,new.product_id,new.stripe_livemode,new.pricing_version,new.legacy_order_id,new.initial_order_id)
 is distinct from row(old.user_id,old.order_kind,old.amount,old.currency,old.price_id,old.product_id,old.stripe_livemode,old.pricing_version,old.legacy_order_id,old.initial_order_id)
 then raise exception 'Saved purchase quotes are immutable'; end if;
 return new;
end $$;
revoke all on function public.guard_initiation_quote() from public,anon,authenticated;

alter table public.initiation_orders drop column purchased_by;

commit;
