-- Owner-approved receipt/binding and partial-refund digital access policy. Not applied.
begin;
create or replace function public.has_bound_console(p_user uuid) returns boolean
language sql stable security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.devices where current_user_id=p_user);
$$;
-- Claim allocation and even delivery are not physical account binding.
create table public.initiation_refund_state (
 payment_intent text primary key,
 amount integer not null check(amount>0),
 refunded_amount integer not null check(refunded_amount>=0 and refunded_amount<=amount),
 disputed boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.initiation_refund_state enable row level security;
revoke all on public.initiation_refund_state from public,anon,authenticated;
grant all on public.initiation_refund_state to service_role;
alter function public.hold_initiation_payment(text,text) rename to hold_initiation_payment_v90;
create function public.hold_initiation_payment(p_intent text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform 1 from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 if p_reason='disputed' then
  insert into initiation_refund_state(payment_intent,amount,refunded_amount,disputed)
  select p_intent,amount,0,true from initiation_orders where stripe_payment_intent=p_intent
  on conflict(payment_intent) do update set disputed=true,updated_at=now();
 end if;
 perform public.hold_initiation_payment_v90(p_intent,p_reason);
end $$;
create function public.record_initiation_refund(p_intent text,p_amount integer,p_refunded integer) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare o initiation_orders; r initiation_refund_state;
begin
 perform 1 from initiation_batches where label='S26' for update;
 perform pg_advisory_xact_lock(hashtextextended('initiation-payment:'||p_intent,0));
 select * into o from initiation_orders where stripe_payment_intent=p_intent for update;
 if o.id is null then raise exception 'Initiation payment must be reconciled before its refund'; end if;
 if p_amount is distinct from o.amount or p_refunded is null or p_refunded<=0 or p_refunded>p_amount then raise exception 'Refund amount mismatch'; end if;
 insert into initiation_refund_state(payment_intent,amount,refunded_amount,disputed)
 values(p_intent,p_amount,p_refunded,o.status='disputed')
 on conflict(payment_intent) do update set refunded_amount=greatest(initiation_refund_state.refunded_amount,excluded.refunded_amount),disputed=initiation_refund_state.disputed or excluded.disputed,updated_at=now()
 returning * into r;
 -- Freeze physical fulfillment until an administrator reconciles canceled packs.
 -- This never releases capacity or invents which packs an external refund canceled.
 perform public.hold_initiation_payment_v90(p_intent,'refunded');
 if r.refunded_amount<r.amount and not r.disputed and o.paid_at is not null then
  update initiation_orders set status='payment_review' where id=o.id;
 end if;
end $$;
revoke all on function public.hold_initiation_payment(text,text),public.record_initiation_refund(text,integer,integer) from public,anon,authenticated;
grant execute on function public.hold_initiation_payment(text,text),public.record_initiation_refund(text,integer,integer) to service_role;
create or replace function membership_private.access_role_for(uid uuid) returns text
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
 if exists(select 1 from public.initiation_refund_state r join public.initiation_orders o on o.stripe_payment_intent=r.payment_intent where o.user_id=uid and o.paid_at is not null and o.status='payment_review' and r.refunded_amount>0 and r.refunded_amount<r.amount and not r.disputed) then return 'voyager'; end if;
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

commit;
