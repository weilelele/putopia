-- S26 dispatch schedule moves two months: Pack 1 Dec 2026, Pack 2 Jan 2027, Pack 3 (Console) Feb 2027, Pack 4 Mar 2027.
-- Months now live in one helper, so a later change never needs the payment functions rewritten.
-- Dispatched and delivered shipments keep their recorded month. Safe to re-run.
begin;
-- Payment and fulfillment functions take this lock first, so no in-flight payment can insert an old month.
select 1 from public.initiation_batches where label='S26' for update;

create or replace function public.initiation_pack_month(p_position integer) returns text
language sql immutable set search_path=public,pg_temp as $$
 select case p_position when 1 then '2026-12' when 2 then '2027-01' when 3 then '2027-02' when 4 then '2027-03' end
$$;
revoke all on function public.initiation_pack_month(integer) from public,anon,authenticated;
grant execute on function public.initiation_pack_month(integer) to service_role;

create or replace function public.ensure_legacy_initiation_packs(p_user uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare legacy_id uuid;
begin
 perform 1 from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 legacy_id:=public.eligible_legacy_initiation_order(p_user);
 if legacy_id is null then return; end if;
 -- Prior dispatched history needs manual mapping, not invented dispatches.
 if exists(select 1 from voyager_orders where id=legacy_id and status in ('shipped','delivered')) or exists(select 1 from device_order_packs where order_id=legacy_id and status in ('shipped','dispatched','delivered')) then return; end if;
 insert into initiation_shipments(user_id,legacy_order_id,position,title,scheduled_month)
 values(p_user,legacy_id,1,'Initiation Pack 1',public.initiation_pack_month(1)),(p_user,legacy_id,2,'Initiation Pack 2',public.initiation_pack_month(2))
 on conflict(user_id,position) do nothing;
end $$;

create or replace function public.complete_initiation_pre_bundles(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare o initiation_orders; hold_reason text; b initiation_batches;
begin
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.id is null or o.user_id <> p_user or (o.stripe_session_id is not null and o.stripe_session_id <> p_session) then raise exception 'Payment binding mismatch'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'NPC payment cannot activate membership'; end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 if b.label is null or public.initiation_occupied_seats() > b.capacity then raise exception 'Capacity requires reconciliation'; end if;
 if exists(select 1 from initiation_members where user_id=p_user and not
 (batch='S26' and source='paid' and legacy_order_id=o.legacy_order_id and o.order_kind='legacy_upgrade'))
 then raise exception 'Existing membership requires reconciliation'; end if;
 if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')='' or coalesce(trim(p_shipping->'address'->>'country'),'') !~ '^[A-Z]{2}$' then raise exception 'Verified Stripe shipping address required'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 if hold_reason is null and o.order_kind='legacy_upgrade' and o.legacy_order_id is distinct from public.eligible_legacy_initiation_order(p_user) then
  update initiation_orders set status='payment_review',stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
  return;
 end if;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=p_order;
 if hold_reason is not null then return; end if;
 if o.order_kind='legacy_upgrade' then
  perform public.ensure_legacy_initiation_packs(p_user);
  if (select count(*) from initiation_shipments where user_id=p_user and position in (1,2)) <> 2 then raise exception 'Historical Pack fulfillment requires reconciliation'; end if;
 end if;
 insert into initiation_members(user_id,batch,source,order_id) values(o.user_id,o.batch,'paid',o.id)
 on conflict(user_id) do update set order_id=excluded.order_id,legacy_order_id=null,active=true;
 insert into initiation_entitlements(user_id,order_id) values(o.user_id,o.id);
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select o.user_id,o.id,n,'Initiation Pack '||n,public.initiation_pack_month(n) from generate_series(1,4) n
 where o.order_kind='standard' or n>2
 on conflict(user_id,position) do update set order_id=excluded.order_id
 where initiation_shipments.order_id is null;
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=o.user_id;
end $$;

create or replace function public.complete_initiation(p_order uuid,p_session text,p_user uuid,p_intent text,p_shipping jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; b initiation_batches; hold_reason text;
begin
 select * into b from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 perform pg_advisory_xact_lock(hashtextextended('initiation-fulfillment:'||p_user::text,0));
 select * into o from initiation_orders where id=p_order for update;
 if o.id is null or o.user_id<>p_user or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or (o.stripe_payment_intent is not null and o.stripe_payment_intent<>p_intent) then raise exception 'Payment binding mismatch'; end if;
 -- Old receipts and new Complete / historical-$12 upgrade use the proven flow.
 if o.order_kind<>'initial' and o.initial_order_id is null then
  perform public.complete_initiation_pre_bundles(p_order,p_session,p_user,p_intent,p_shipping); return;
 end if;
 if o.status='paid' then return; end if;
 if o.status not in ('pending','payment_review') then raise exception 'Payment requires manual reconciliation'; end if;
 if not exists(select 1 from voyager_profiles where id=p_user and account_kind='human') then raise exception 'NPC payment cannot activate membership'; end if;
 if b.label is null or public.initiation_occupied_seats()>b.capacity then raise exception 'Capacity requires reconciliation'; end if;
 if coalesce(trim(p_shipping->>'name'),'')='' or coalesce(trim(p_shipping->'address'->>'line1'),'')='' or coalesce(trim(p_shipping->'address'->>'country'),'') !~ '^[A-Z]{2}$' then raise exception 'Verified Stripe shipping address required'; end if;
 select reason into hold_reason from initiation_payment_holds where payment_intent=p_intent;
 if o.initial_order_id is not null and o.initial_order_id is distinct from public.eligible_initial_initiation_order(p_user) then hold_reason:='payment_review'; end if;
 update initiation_orders set status=coalesce(hold_reason,'paid'),stripe_session_id=p_session,stripe_payment_intent=p_intent,paid_at=now(),shipping=p_shipping where id=o.id;
 if hold_reason is not null then return; end if;
 if o.order_kind='initial' then
  if exists(select 1 from initiation_members where user_id=p_user) then raise exception 'Existing membership requires reconciliation'; end if;
  insert into initiation_members(user_id,batch,source,order_id) values(p_user,o.batch,'paid',o.id);
 else
  if not exists(select 1 from initiation_members where user_id=p_user and source='paid' and order_id=o.initial_order_id and active) then raise exception 'Initial membership requires reconciliation'; end if;
  update initiation_members set order_id=o.id where user_id=p_user;
  insert into initiation_entitlements(user_id,order_id) values(p_user,o.id);
 end if;
 insert into initiation_shipments(user_id,order_id,position,title,scheduled_month)
 select p_user,o.id,n,'Initiation Pack '||n,public.initiation_pack_month(n) from generate_series(1,4) n
 where (o.order_kind='initial' and n<=2) or (o.order_kind='legacy_upgrade' and n>2);
 update voyager_profiles set role=case when role='architect' then role else 'voyager'::user_role end,
 member_source='paid',member_no=coalesce(member_no,nextval('public.voyager_member_no_seq')),
 member_since=coalesce(member_since,now()),batch_label='S26' where id=p_user;
end $$;

-- Existing members: only shipments still on the old month for their position and not yet with a carrier.
update public.initiation_shipments set scheduled_month=public.initiation_pack_month(position)
where status in ('planned','preparing')
 and scheduled_month=case position when 1 then '2026-10' when 2 then '2026-11' when 3 then '2026-12' when 4 then '2027-01' end;

-- Kyoto One's own three-stage records (earlier preorders and the batch configuration). The rollback restores from here.
create table if not exists public.s26_dispatch_shift_v113_backup (kind text not null, ref text not null, value jsonb, primary key(kind,ref));
alter table public.s26_dispatch_shift_v113_backup enable row level security;
revoke all on public.s26_dispatch_shift_v113_backup from public,anon,authenticated;
insert into public.s26_dispatch_shift_v113_backup(kind,ref,value)
 select 'batch',slug,jsonb_build_object('content',content,'published_content',published_content) from public.device_batches where slug='kyoto-one'
 on conflict do nothing;
insert into public.s26_dispatch_shift_v113_backup(kind,ref,value)
 select 'pack',p.id::text,to_jsonb(p.expected_window) from public.device_order_packs p join public.voyager_orders o on o.id=p.order_id
 where o.device_batch_slug='kyoto-one' and p.status in ('planned','preparing') and p.stage_position between 1 and 3
 and not exists(select 1 from public.initiation_shipments s where s.legacy_order_id=p.order_id)
 on conflict do nothing;

create function pg_temp.kyoto_schedule(c jsonb) returns jsonb language sql as $$
 select case when c is null then null else jsonb_set(jsonb_set(c,'{estimatedCompletion}',to_jsonb('Estimated final dispatch: February 2027'::text)),'{distributionStages}',coalesce((
  select jsonb_agg(case s.stage->>'id'
   when 'initial-voyager-pack' then jsonb_set(s.stage,'{window}',to_jsonb('December 2026'::text))
   when 'components-pack' then jsonb_set(s.stage,'{window}',to_jsonb('January 2027'::text))
   when 'console' then jsonb_set(s.stage,'{window}',to_jsonb('February 2027'::text))
   else s.stage end order by s.ord)
  from jsonb_array_elements(c->'distributionStages') with ordinality s(stage,ord)),'[]'::jsonb)) end
$$;
update public.device_batches set content=pg_temp.kyoto_schedule(content),published_content=pg_temp.kyoto_schedule(published_content) where slug='kyoto-one';
drop function pg_temp.kyoto_schedule(jsonb);

update public.device_order_packs p set expected_window=case p.stage_position when 1 then 'December 2026' when 2 then 'January 2027' when 3 then 'February 2027' end
from public.voyager_orders o
where o.id=p.order_id and o.device_batch_slug='kyoto-one' and p.status in ('planned','preparing') and p.stage_position between 1 and 3
 and not exists(select 1 from public.initiation_shipments s where s.legacy_order_id=p.order_id);
commit;
