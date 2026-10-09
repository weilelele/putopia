-- NPC profile + granted S26 roster administration. Requires v85; independent of v86.
-- Local implementation only. No identity seeds, payments or entitlement writes.
begin;

create function public.npc_initiation_state(p_actor uuid,p_user uuid default null) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; m initiation_members;
begin
 if not exists(select 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human') then raise exception 'Architect permission required'; end if;
 select * into b from initiation_batches where label='S26';
 if b.label is null then raise exception 'S26 registration is unavailable'; end if;
 if p_user is not null then
  if not exists(select 1 from voyager_profiles where id=p_user and account_kind='npc') then raise exception 'NPC not found'; end if;
  select * into m from initiation_members where user_id=p_user;
 end if;
 return jsonb_build_object('capacity',b.capacity,'occupied',public.initiation_occupied_seats(),
 'member',case when m.user_id is null then null else jsonb_build_object('batch',m.batch,'source',m.source,'active',m.active) end);
end $$;

create function public.save_npc_profile(p_actor uuid,p_user uuid,p_profile jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare b initiation_batches; person voyager_profiles; m initiation_members; grant_result jsonb;
 v_label text := p_profile->>'batchLabel'; identity_role text := p_profile->>'role'; note text := p_profile->>'grantNote';
begin
 -- Same serialization point / lock order as v85 grants and paid reservations.
 select * into b from initiation_batches where label='S26' for update;
 if b.label is null then raise exception 'S26 registration is unavailable'; end if;
 perform 1 from voyager_profiles where id=p_actor and role='architect' and account_kind='human' for share;
 if not found then raise exception 'Architect permission required'; end if;
 select * into person from voyager_profiles where id=p_user and account_kind='npc' for update;
 if person.id is null then raise exception 'NPC not found'; end if;
 if jsonb_typeof(p_profile) is distinct from 'object' then raise exception 'Invalid NPC profile'; end if;
 if exists(select 1 from unnest(array['displayName','role','bio','avatarUrl','location','batchLabel','grantNote']) k where jsonb_typeof(p_profile->k) is distinct from 'string') then raise exception 'Invalid NPC profile fields'; end if;
 if length(trim(p_profile->>'displayName')) not between 1 and 80 or length(p_profile->>'bio')>2000 or length(p_profile->>'location')>120 or length(p_profile->>'avatarUrl')>2048 or length(v_label) not between 1 and 120 or v_label ~ E'[\\r\\n\\t]' or length(note)>1000 then raise exception 'Invalid NPC profile fields'; end if;
 if identity_role not in ('guest','applicant','voyager','architect') then raise exception 'Invalid NPC role'; end if;
 if trim(p_profile->>'avatarUrl') <> '' and (trim(p_profile->>'avatarUrl') !~ '^https://[^/[:space:]@]+(/[^[:space:]]*)?$') then raise exception 'Use an HTTPS avatar URL'; end if;
 if v_label <> 'S26' and not exists(select 1 from batches where label=v_label) and not exists(select 1 from voyager_profiles where batch_label=v_label) then raise exception 'Unknown member batch'; end if;
 select * into m from initiation_members where user_id=p_user;
 if m.user_id is not null then
  if m.batch <> 'S26' or m.source <> 'granted' then raise exception 'Membership requires management review'; end if;
  if v_label <> 'S26' or identity_role not in ('voyager','architect') then raise exception 'Registered S26 NPCs cannot leave or lose member identity; management review required'; end if;
 end if;
 if v_label='S26' then
  if identity_role not in ('voyager','architect') then raise exception 'S26 registration requires Voyager or Architect identity'; end if;
  if person.member_source is distinct from 'granted' then raise exception 'Membership source requires management review'; end if;
  if m.user_id is null and length(trim(note))=0 then raise exception 'Grant audit note required'; end if;
  if m.user_id is null and public.initiation_occupied_seats() >= b.capacity then raise exception 'S26 capacity exhausted'; end if;
 end if;
 update voyager_profiles set display_name=trim(p_profile->>'displayName'),role=identity_role::user_role,
 bio=nullif(trim(p_profile->>'bio'),''),avatar_url=nullif(trim(p_profile->>'avatarUrl'),''),
 location=nullif(trim(p_profile->>'location'),''),batch_label=v_label where id=p_user;
 if v_label='S26' and m.user_id is null then
  grant_result := public.grant_initiation_member(p_user,left('NPC administrator '||p_actor::text||': '||trim(note),1000));
 end if;
 return public.npc_initiation_state(p_actor,p_user);
end $$;

-- Deferred checks permit the profile+roster transaction but reject tag-only edits
-- through other admin entry points. No existing rows are backfilled or removed.
create function public.check_npc_roster_consistency() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare person voyager_profiles; m initiation_members; target uuid;
begin
 if tg_table_name='voyager_profiles' then target:=new.id;
 else
  target:=old.user_id;
  if tg_op='INSERT' then target:=new.user_id; end if;
  if tg_op='UPDATE' and old.user_id is distinct from new.user_id then
   if exists(select 1 from voyager_profiles where id=old.user_id and account_kind='npc') then raise exception 'NPC roster reassignment requires management review'; end if;
  end if;
  if tg_op='DELETE' and exists(select 1 from voyager_profiles where id=old.user_id and account_kind='npc') then raise exception 'NPC seat release requires management review'; end if;
 end if;
 select * into person from voyager_profiles where id=target;
 if person.account_kind is distinct from 'npc' then return null; end if;
 select * into m from initiation_members where user_id=target;
 if (person.batch_label='S26' and m.user_id is null) or
 (m.user_id is not null and (m.batch<>'S26' or m.source<>'granted' or person.batch_label<>'S26' or person.member_source is distinct from 'granted' or person.role not in ('voyager','architect'))) then
  raise exception 'NPC batch and S26 roster must agree; use NPC administration or management review';
 end if;
 return null;
end $$;
create constraint trigger npc_profile_roster_consistency after insert or update of batch_label,role,member_source,account_kind on public.voyager_profiles
 deferrable initially deferred for each row execute function public.check_npc_roster_consistency();
create constraint trigger npc_member_roster_consistency after insert or update or delete on public.initiation_members
 deferrable initially deferred for each row execute function public.check_npc_roster_consistency();
revoke all on function public.npc_initiation_state(uuid,uuid),public.save_npc_profile(uuid,uuid,jsonb),public.check_npc_roster_consistency() from public,anon,authenticated;
grant execute on function public.npc_initiation_state(uuid,uuid),public.save_npc_profile(uuid,uuid,jsonb) to service_role;
commit;
