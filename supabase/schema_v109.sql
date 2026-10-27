-- v109: bounded server-only account lookup and atomic checkout attribution.
-- Additive: install before deploying the single-request checkout. No existing payments are changed.
begin;
create schema if not exists putopia_private;
revoke all on schema putopia_private from public, anon, authenticated;
grant usage on schema putopia_private to service_role;

-- Guest checkout has no auth.uid(). Only the existing trusted server service role may
-- perform this read. Keep the required auth.users privilege inside a non-exposed schema;
-- do not grant table access or expose Auth metadata/tokens to API callers.
create or replace function putopia_private.find_activation_account(p_email text)
returns table(id uuid, activated boolean)
language sql stable security definer set search_path='' as $$
  select u.id, p.registered_at is not null
  from auth.users u left join public.voyager_profiles p on p.id=u.id
  where lower(u.email)=lower(btrim(p_email)) and btrim(p_email)<>''
  limit 2;
$$;
revoke all on function putopia_private.find_activation_account(text) from public, anon, authenticated;
grant execute on function putopia_private.find_activation_account(text) to service_role;

create or replace function public.find_activation_account(p_email text)
returns table(id uuid, activated boolean)
language sql stable security invoker set search_path='' as $$
  select * from putopia_private.find_activation_account(p_email);
$$;
revoke all on function public.find_activation_account(text) from public, anon, authenticated;
grant execute on function public.find_activation_account(text) to service_role;

create or replace function public.save_initiation_checkout_attribution(p_order uuid,p_user uuid,p_meta jsonb,p_analytics jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if jsonb_typeof(p_meta) is distinct from 'object' or jsonb_typeof(p_analytics) is distinct from 'object' then
    raise exception 'Checkout attribution must be an object';
  end if;
  update public.initiation_orders set
    meta_attribution=case when meta_attribution='{}'::jsonb then p_meta else meta_attribution end,
    analytics_context=case when analytics_context='{}'::jsonb then p_analytics else analytics_context end
  where id=p_order and user_id=p_user and status='pending' and stripe_session_id is null;
  -- A concurrent request may already have persisted the contexts and bound the same
  -- idempotent Session. It is safe to resume, but never write to a different or paid order.
  if not found and not exists(select 1 from public.initiation_orders
    where id=p_order and user_id=p_user and status='pending' and stripe_session_id is not null) then
    raise exception 'Checkout attribution reservation is unavailable';
  end if;
end;
$$;
revoke all on function public.save_initiation_checkout_attribution(uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_initiation_checkout_attribution(uuid,uuid,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
