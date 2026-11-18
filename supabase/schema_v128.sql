-- A hosted Shopify cart can outlive its 35-minute local seat hold.
-- Re-check eligibility and capacity under the S26 lock before capturing a late authorization.
begin;
create or replace function public.bind_initiation_shopify_authorization(p_reservation uuid,p_shop text,p_order_id text,p_authorization_id text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; o initiation_orders; c initiation_shopify_checkouts;
begin
 select * into strict b from initiation_batches where label='S26' for update;
 select * into strict o from initiation_orders where id=p_reservation for update;
 select * into strict c from initiation_shopify_checkouts where order_id=o.id for update;
 if c.shop is distinct from p_shop or p_order_id is null or p_authorization_id is null then raise exception 'Authorization does not match the Shopify reservation'; end if;
 if c.shopify_order_id is not null then
  if c.shopify_order_id<>p_order_id or c.authorization_id<>p_authorization_id or o.status not in ('pending','paid') then raise exception 'The Shopify reservation already has a different authorization'; end if;
  if o.status='paid' or c.capture_attempted_at>now()-interval '1 minute' then return false; end if;
 else
  if c.refunded_amount>0 or c.canceled_at is not null or o.paid_at is not null or c.capture_id is not null then raise exception 'This payment was reversed or already captured'; end if;
  if c.superseded_by is not null or o.stripe_session_id is not null or o.stripe_payment_intent is not null then raise exception 'This Shopify reservation cannot be captured'; end if;
  if o.status in ('pending','canceled') and o.expires_at<=now() then
   if not b.checkout_open or not b.stripe_livemode
    or not exists(select 1 from voyager_profiles where id=o.user_id and account_kind='human')
    or exists(select 1 from initiation_entitlements where user_id=o.user_id and (active or console_claimed_at is not null))
    or exists(select 1 from initiation_members where user_id=o.user_id and active and source='granted')
    or exists(select 1 from initiation_orders other left join initiation_shopify_checkouts checkout on checkout.order_id=other.id
      where other.user_id=o.user_id and other.id<>o.id
       and other.id is distinct from o.membership_order_id and other.id is distinct from o.initial_order_id
       and (other.status in ('paid','payment_review','disputed') or
        (other.status='pending' and (other.expires_at>now() or checkout.order_id is null or checkout.authorization_id is not null))))
    or (o.membership_order_id is not null and o.membership_order_id is distinct from public.eligible_voyager_membership_order(o.user_id))
    or (o.order_kind='legacy_upgrade' and
      ((o.initial_order_id is not null and o.initial_order_id is distinct from public.eligible_initial_initiation_order(o.user_id)) or
       (o.legacy_order_id is not null and o.legacy_order_id is distinct from public.eligible_legacy_initiation_order(o.user_id))))
    or (o.order_kind in ('membership','initial','standard') and o.membership_order_id is null and exists(select 1 from initiation_members where user_id=o.user_id and active))
    or (o.membership_order_id is null and o.initial_order_id is null and o.legacy_order_id is null and public.initiation_occupied_seats()>=b.capacity)
   then raise exception 'Expired Shopify checkout cannot reserve a seat'; end if;
   update initiation_orders set status='pending',expires_at=now()+interval '35 minutes' where id=o.id returning * into o;
  end if;
  if o.status<>'pending' or o.expires_at<=now() then raise exception 'This Shopify reservation cannot be captured'; end if;
  if o.membership_order_id is not null and o.membership_order_id is distinct from public.eligible_voyager_membership_order(o.user_id) then raise exception 'Membership credit is no longer available'; end if;
  if o.order_kind='legacy_upgrade' and ((o.initial_order_id is not null and o.initial_order_id is distinct from public.eligible_initial_initiation_order(o.user_id)) or
   (o.legacy_order_id is not null and o.legacy_order_id is distinct from public.eligible_legacy_initiation_order(o.user_id))) then raise exception 'Initial Pack qualification changed'; end if;
  if o.order_kind in ('membership','initial','standard') and o.membership_order_id is null and exists(select 1 from initiation_members where user_id=o.user_id and active) then raise exception 'An active membership already exists'; end if;
  with superseded as (
   update initiation_shopify_checkouts other set superseded_by=o.id from initiation_orders sibling
    where sibling.id=other.order_id and sibling.user_id=o.user_id and sibling.id<>o.id and sibling.status='pending' and other.authorization_id is null
   returning other.order_id
  ) update initiation_orders sibling set status='canceled' from superseded where sibling.id=superseded.order_id;
 end if;
 update initiation_shopify_checkouts set shopify_order_id=p_order_id,authorization_id=p_authorization_id,capture_attempted_at=now() where order_id=o.id;
 return true;
end $$;
revoke all on function public.bind_initiation_shopify_authorization(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.bind_initiation_shopify_authorization(uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
