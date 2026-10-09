-- P0 digital access + direct REST defenses. Apply AFTER v83, v85, v90, v87, v88.
-- v90 supplies eligible_legacy_initiation_order; absence is an installation error,
-- never permission to fall back to role. No existing NPC trigger is replaced.
begin;
do $$ begin
 if to_regprocedure('public.eligible_legacy_initiation_order(uuid)') is null then raise exception 'Apply v90 before v89'; end if;
end $$;
create schema if not exists membership_private;
revoke all on schema membership_private from public,anon,authenticated;

create function membership_private.access_role_for(uid uuid) returns text
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare p public.voyager_profiles;
begin
 if uid is null then return 'guest'; end if;
 select * into p from public.voyager_profiles where id=uid;
 if p.id is null then return 'applicant'; end if;
 -- Administrative access is distinct from paid membership; NPC roles are not admins.
 if p.role='architect' and p.account_kind='human' then return 'architect'; end if;
 if exists(select 1 from public.initiation_members m where m.user_id=uid and m.active and
   (m.source='granted' or (m.source='paid' and exists(
     select 1 from public.initiation_entitlements e join public.initiation_orders o on o.id=e.order_id
     where e.user_id=uid and e.order_id=m.order_id and o.user_id=uid and e.active and o.status='paid'
     and not exists(select 1 from public.initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent)))))
 then return 'voyager'; end if;
 -- Independent historical purchases survive a refund of a different Initiation.
 if public.eligible_legacy_initiation_order(uid) is not null then return 'voyager'; end if;
 if exists(select 1 from public.voyager_orders o where o.user_id=uid and p.account_kind='human'
   and o.product_type='device_batch_claim' and o.amount>0 and o.paid_at is not null
   and o.stripe_session_id ~ '^cs_live_' and o.stripe_payment_intent ~ '^pi_'
   and o.status in ('paid','preparing','shipped','delivered')
   and not exists(select 1 from public.initiation_payment_holds h where h.payment_intent=o.stripe_payment_intent))
 then return 'voyager'; end if;
 -- Compatibility only for old granted identities with NO new membership history.
 -- New inactive/revoked grants and refunded new purchases cannot fall through here.
 if p.role in ('voyager','architect') and p.member_source='granted'
   and not exists(select 1 from public.initiation_members m where m.user_id=uid)
   and not exists(select 1 from public.initiation_orders o where o.user_id=uid)
 then return 'voyager'; end if;
 return 'applicant';
end $$;
revoke all on function membership_private.access_role_for(uuid) from public,anon,authenticated;
create function public.effective_access_role() returns text
language sql stable security definer set search_path=public,pg_temp as $$
 select membership_private.access_role_for(auth.uid());
$$;
revoke all on function public.effective_access_role() from public;
grant execute on function public.effective_access_role() to anon,authenticated,service_role;

-- Restrictive policy prevents any legacy permissive SELECT/ALL policy bypass.
create policy intel_digital_access_guard on public.intel as restrictive for select to anon,authenticated
 using (not classified or (select public.effective_access_role()) in ('voyager','architect'));
drop policy if exists intel_select_voyager on public.intel;
create policy intel_select_voyager on public.intel for select to authenticated
 using (classified and (select public.effective_access_role()) in ('voyager','architect'));

create function membership_private.batch_voter(uid uuid,slug text) returns boolean
language sql stable security invoker set search_path=public,pg_temp as $$
 select membership_private.access_role_for(uid)='architect' or exists(
 select 1 from public.device_batch_units u join public.voyager_orders o on o.id=u.order_id
 where u.user_id=uid and o.user_id=uid and u.batch_slug=slug and o.device_batch_slug=slug
 and u.status in ('assigned','preparing','shipped','delivered','return_pending')
 and o.status in ('paid','preparing','shipped','delivered')
 and (o.product_type='device_batch_claim' or (o.product_type='initiation_console_claim' and exists(
 select 1 from public.initiation_entitlements e join public.initiation_orders io on io.id=e.order_id
 where e.user_id=uid and io.user_id=uid and e.active and io.status='paid' and e.console_order_id=o.id)))
 );
$$;
revoke all on function membership_private.batch_voter(uuid,text) from public,anon,authenticated;
create function public.can_vote_in_device_batch(p_batch text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(membership_private.batch_voter(auth.uid(),p_batch),false);
$$;
revoke all on function public.can_vote_in_device_batch(text) from public;
grant execute on function public.can_vote_in_device_batch(text) to anon,authenticated,service_role;

drop policy if exists intel_all_architect on public.intel;
create policy intel_all_architect on public.intel for all to authenticated
 using ((select public.effective_access_role())='architect')
 with check ((select public.effective_access_role())='architect');
drop policy if exists votes_all_architect on public.votes;
create policy votes_all_architect on public.votes for all to authenticated
 using ((select public.effective_access_role())='architect')
 with check ((select public.effective_access_role())='architect');

-- Vote questions remain public; scope gates participation, not discovery.
create policy votes_browse on public.votes for select to anon,authenticated using (true);
create function membership_private.validate_vote_response() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.votes; effective text; n integer; actor uuid:=auth.uid(); trusted boolean:=current_setting('role',true)='service_role';
begin
 if tg_op='UPDATE' and ((not trusted and actor is null) or (to_jsonb(new)-array['selected_options','voter_name']) is distinct from (to_jsonb(old)-array['selected_options','voter_name'])) then raise exception 'Vote identity is immutable'; end if;
 if trusted then actor:=new.user_id; end if;
 if actor is null then
  if new.user_id is not null or new.anon_token is null or new.anon_token !~ '^[a-zA-Z0-9_-]{16,128}$' then raise exception 'Invalid anonymous voter'; end if;
  new.voter_name:=null;
 else
  if new.user_id is distinct from actor or new.anon_token is not null then raise exception 'Invalid voter identity'; end if;
  select display_name into new.voter_name from public.voyager_profiles where id=actor;
 end if;
 select * into v from public.votes where id=new.vote_id for share;
 if v.id is null or not v.is_active or (v.ends_at is not null and v.ends_at<=statement_timestamp()) then raise exception 'Voting has closed'; end if;
 if tg_op='UPDATE' and v.device_batch_slug is null then raise exception 'Vote responses are final'; end if;
 if v.device_batch_slug is not null and not coalesce(membership_private.batch_voter(actor,v.device_batch_slug),false) then raise exception 'Batch holder access required'; end if;
 effective:=membership_private.access_role_for(actor);
 if not coalesce((effective=any(v.scope) or 'public'=any(v.scope)),false) then raise exception 'Vote scope denied'; end if;
 if jsonb_typeof(v.options) is distinct from 'array' then raise exception 'Invalid vote options'; end if;
 n:=jsonb_array_length(v.options);
 if n=0 or exists(select 1 from jsonb_array_elements(v.options) o where jsonb_typeof(o->'id') is distinct from 'string' or length(o->>'id')=0)
 or (select count(distinct o->>'id') from jsonb_array_elements(v.options) o)<>n then raise exception 'Invalid vote options'; end if;
 if v.type::text not in ('single','multi') or coalesce(cardinality(new.selected_options),0)=0
 or (v.type='single' and cardinality(new.selected_options)<>1)
 or array_ndims(new.selected_options)<>1
 or (select count(distinct x) from unnest(new.selected_options) x)<>cardinality(new.selected_options)
 or exists(select 1 from unnest(new.selected_options) x where x is null or not exists(select 1 from jsonb_array_elements(v.options) o where o->>'id'=x))
 then raise exception 'Invalid vote selection'; end if;
 return new;
end $$;
revoke all on function membership_private.validate_vote_response() from public,anon,authenticated;
create trigger vote_response_validation before insert or update on public.vote_responses
 for each row execute function membership_private.validate_vote_response();
drop policy if exists responses_insert_own on public.vote_responses;
create policy responses_insert_own on public.vote_responses for insert to anon,authenticated
 with check ((auth.uid() is not null and user_id=auth.uid() and anon_token is null)
 or (auth.uid() is null and user_id is null and anon_token ~ '^[a-zA-Z0-9_-]{16,128}$'));
revoke update on public.vote_responses from public,anon;
grant update on public.vote_responses to authenticated;
create policy responses_update_own_batch on public.vote_responses for update to authenticated
 using (user_id=auth.uid() and anon_token is null and exists(select 1 from public.votes v where v.id=vote_id and v.device_batch_slug is not null))
 with check (user_id=auth.uid() and anon_token is null and exists(select 1 from public.votes v where v.id=vote_id and v.device_batch_slug is not null));

-- Table INSERT grants would allow clients to explicitly supply future sensitive
-- columns. Registration upsert uses only these fields; defaults remain trusted.
revoke insert on public.voyager_profiles from public,anon,authenticated;
grant insert(id,display_name,bio,avatar_url,social_x,social_instagram,social_linkedin,location,role,observation_days,worlds_discovered,email,registered_at) on public.voyager_profiles to authenticated;
create function membership_private.protect_profile_access() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare editable text[]:=array['display_name','bio','avatar_url','social_x','social_instagram','social_linkedin','location','observation_days','worlds_discovered','email','registered_at','updated_at'];
begin
 if current_user not in ('anon','authenticated') then return new; end if;
 if new.email is not null and lower(new.email) is distinct from lower(auth.jwt()->>'email') and (tg_op='INSERT' or new.email is distinct from old.email) then raise exception 'Profile email must match the authenticated account'; end if;
 if tg_op='INSERT' then
  if new.id is distinct from auth.uid() or new.role<>'applicant' or new.observation_days<>0 or new.worlds_discovered<>0 then raise exception 'Profile identity is managed by the server'; end if;
  return new;
 end if;
 if public.effective_access_role()='architect' then return new; end if;
 if new.id is distinct from auth.uid() then raise exception 'Profile ownership required'; end if;
 -- Old registration upsert sends applicant + zero stats; preserve provisioned identity.
 if old.registered_at is null and new.registered_at is not null and new.role='applicant' and new.observation_days=0 and new.worlds_discovered=0 then
  new.role:=old.role; new.observation_days:=old.observation_days; new.worlds_discovered:=old.worlds_discovered;
 end if;
 -- Existing A/B assignment is a one-time non-privileged setting.
 if old.experiment_group is null and new.experiment_group in ('direct','task_gated') then editable:=editable||'experiment_group'::text; end if;
 if old.registered_at is not null and new.registered_at is distinct from old.registered_at then raise exception 'Registration timestamp is immutable'; end if;
 if (to_jsonb(new)-editable) is distinct from (to_jsonb(old)-editable) then raise exception 'Profile access fields are managed by the server'; end if;
 return new;
end $$;
revoke all on function membership_private.protect_profile_access() from public,anon,authenticated;
create trigger profile_access_fields_guard before insert or update on public.voyager_profiles
 for each row execute function membership_private.protect_profile_access();
-- Defense in depth for old server provisioning functions; no caller-selected uid.
revoke all on function public.provision_voyager(uuid) from public,anon,authenticated;
grant execute on function public.provision_voyager(uuid) to service_role;
commit;
