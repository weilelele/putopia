-- Claim an anonymous (pay-first) Initiation purchase into a registered account.
-- NOT APPLIED. Requires schema_v104 (anonymous checkout sessions) and v103.
--
-- A guest who already has an account can pay without logging in. After they
-- log in, the app proves the same browser held the anonymous session (signed
-- claim cookie) and calls transfer_guest_initiation to move the purchase.
-- Stripe metadata keeps naming the anonymous buyer, so the order records it in
-- purchased_by and payment checks compare Stripe against purchased_by.
-- Rollback: schema_v106.rollback.sql.
begin;

alter table public.initiation_orders add column purchased_by uuid references public.voyager_profiles(id);
comment on column public.initiation_orders.purchased_by is
  'Anonymous checkout account that paid, when a registered account later claimed the order. Stripe metadata user_id names this account.';

-- Quotes stay immutable; user_id may change exactly once, inside a guest transfer.
create or replace function public.guard_initiation_quote() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if row(new.order_kind,new.amount,new.currency,new.price_id,new.product_id,new.stripe_livemode,new.pricing_version,new.legacy_order_id,new.initial_order_id)
 is distinct from row(old.order_kind,old.amount,old.currency,old.price_id,old.product_id,old.stripe_livemode,old.pricing_version,old.legacy_order_id,old.initial_order_id)
 then raise exception 'Saved purchase quotes are immutable'; end if;
 if new.user_id is distinct from old.user_id or new.purchased_by is distinct from old.purchased_by then
  if not (current_setting('initiation.guest_transfer', true) = 'on' and old.purchased_by is null and new.purchased_by = old.user_id)
  then raise exception 'Saved purchase quotes are immutable'; end if;
 end if;
 return new;
end $$;

/**
 * Returns 'transferred', 'nothing' (no claimable order), 'seat_owned' (the
 * account already holds a seat) or 'needs_support' (the account has other
 * Initiation history that a person must reconcile). Never partially moves.
 */
create function public.transfer_guest_initiation(p_from uuid, p_to uuid) returns text
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; claim initiation_orders; f voyager_profiles;
begin
 if p_from = p_to then return 'nothing'; end if;
 -- Same lock order as reserve/complete_initiation, so a webhook completing this order waits.
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||least(p_from,p_to)::text,0));
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||greatest(p_from,p_to)::text,0));
 if not exists(select 1 from auth.users where id=p_from and is_anonymous) then raise exception 'Only an anonymous checkout can be claimed'; end if;
 if not exists(select 1 from auth.users u join voyager_profiles p on p.id=u.id where u.id=p_to and not u.is_anonymous and p.account_kind='human')
 then raise exception 'The claiming account must be a registered human account'; end if;

 select * into claim from initiation_orders where user_id=p_from and status in ('pending','payment_review','paid')
  order by created_at desc limit 1 for update;
 if claim.id is null then return 'nothing'; end if;
 if exists(select 1 from initiation_members where user_id=p_to) or exists(select 1 from initiation_entitlements where user_id=p_to)
 then return 'seat_owned'; end if;
 if exists(select 1 from initiation_orders where user_id=p_to and status in ('pending','payment_review','paid','disputed'))
  or exists(select 1 from initiation_shipments where user_id=p_to)
  or public.eligible_legacy_initiation_order(p_to) is not null or public.eligible_initial_initiation_order(p_to) is not null
 then return 'needs_support'; end if;

 perform set_config('initiation.guest_transfer','on',true);
 update initiation_orders set purchased_by=user_id, user_id=p_to where user_id=p_from;
 perform set_config('initiation.guest_transfer','off',true);
 update initiation_members set user_id=p_to where user_id=p_from;
 update initiation_entitlements set user_id=p_to where user_id=p_from;
 update initiation_shipments set user_id=p_to where user_id=p_from;
 -- Calibration answers follow the purchase unless the account already calibrated.
 if not exists(select 1 from voyager_intake where user_id=p_to) then
  update voyager_intake set user_id=p_to where user_id=p_from;
 end if;
 -- Membership fields complete_initiation wrote on the anonymous profile.
 select * into f from voyager_profiles where id=p_from;
 if f.batch_label is not null then
  update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
   member_source=f.member_source, member_no=coalesce(member_no,f.member_no),
   member_since=coalesce(member_since,f.member_since), batch_label=f.batch_label
  where id=p_to;
  update voyager_profiles set role='applicant', member_source=default, member_no=null, member_since=null, batch_label=null where id=p_from;
 end if;
 return 'transferred';
end $$;

revoke all on function public.transfer_guest_initiation(uuid,uuid), public.guard_initiation_quote() from public,anon,authenticated;
grant execute on function public.transfer_guest_initiation(uuid,uuid) to service_role;

commit;
