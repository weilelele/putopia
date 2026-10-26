-- Cross-device Signal Calibration reminder cooldown. NOT APPLIED to production.
-- Requires v103. v105 still removes calibration from checkout prerequisites.
begin;

create table public.voyager_calibration_reminders (
 user_id uuid primary key references public.voyager_profiles(id) on delete cascade,
 last_prompted_at timestamptz not null
);
alter table public.voyager_calibration_reminders enable row level security;
revoke all on public.voyager_calibration_reminders from public,anon,authenticated;
grant all on public.voyager_calibration_reminders to service_role;

-- A guest purchase claimed by an existing account keeps its reminder cooldown.
-- The membership transfer is the canonical ownership change (v106, when present).
create function public.transfer_voyager_calibration_reminder() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.user_id is distinct from old.user_id then
  insert into voyager_calibration_reminders(user_id,last_prompted_at)
  select new.user_id,last_prompted_at from voyager_calibration_reminders where user_id=old.user_id
  on conflict(user_id) do update set last_prompted_at=greatest(voyager_calibration_reminders.last_prompted_at,excluded.last_prompted_at);
  delete from voyager_calibration_reminders where user_id=old.user_id;
 end if;
 return new;
end $$;
revoke all on function public.transfer_voyager_calibration_reminder() from public,anon,authenticated;
create trigger transfer_voyager_calibration_reminder after update of user_id on public.initiation_members
 for each row execute function public.transfer_voyager_calibration_reminder();

-- Only a verified server session supplies p_user. No browser can call this RPC.
-- Claim atomically so simultaneous tabs/devices cannot show duplicate invitations.
create function public.claim_voyager_calibration_reminder(p_user uuid,p_snooze boolean default false) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare person voyager_profiles; purchase initiation_orders; prompted_at timestamptz;
begin
 -- Same per-user lock as save_voyager_intake: completion wins over a future reminder.
 perform pg_advisory_xact_lock(hashtextextended('voyager-path:'||p_user::text,0));
 select * into person from voyager_profiles where id=p_user;
 if person.id is null or person.account_kind is distinct from 'human' then return jsonb_build_object('status','ineligible'); end if;
 if exists(select 1 from voyager_intake where user_id=p_user and version='voyager-profile-v1') then
  return jsonb_build_object('status','completed');
 end if;
 select o.* into purchase from initiation_members m join initiation_orders o on o.id=m.order_id and o.user_id=m.user_id
 where m.user_id=p_user and m.source='paid' and m.active and o.status='paid'
 and o.order_kind in ('initial','standard','legacy_upgrade')
 and (o.order_kind='initial' or exists(select 1 from initiation_entitlements e where e.user_id=p_user and e.order_id=o.id and e.active));
 if purchase.id is null then return jsonb_build_object('status','ineligible'); end if;

 insert into voyager_calibration_reminders(user_id,last_prompted_at) values(p_user,statement_timestamp())
 on conflict(user_id) do update set last_prompted_at=excluded.last_prompted_at
 where p_snooze or voyager_calibration_reminders.last_prompted_at<=statement_timestamp()-interval '24 hours'
 returning last_prompted_at into prompted_at;
 if prompted_at is null then return jsonb_build_object('status','cooldown'); end if;
 if p_snooze then return jsonb_build_object('status','deferred'); end if;
 return jsonb_build_object('status','due','promptedAt',prompted_at,'snapshot',jsonb_build_object(
  'userId',p_user,'status',case when purchase.order_kind='initial' then 'legacy_pack' else 'initiated' end,
  'paymentStatus','paid','purchaseKind',purchase.order_kind,'role',person.role,'calibrated',false,'error',null
 ));
end $$;
revoke all on function public.claim_voyager_calibration_reminder(uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_voyager_calibration_reminder(uuid,boolean) to service_role;

commit;
