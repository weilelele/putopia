-- "Has device" status for Worlds reporting.
--
-- A user counts as a device holder when EITHER
--   1. they actually received a device (delivered device_batch_claim order
--      matched to a unit) — derived in code, never stored; or
--   2. the back office granted the status — a row in device_access_grants.
--
-- Grants live in their own table, not a profile column: voyager_profiles lets
-- users update their own row, so a column there could be self-granted. Here
-- authenticated users may only read their own row; writes are service-role only.
-- NPC batch allocation is unrelated (that configures devices, not this status).
--
-- Applied to production (project oxwfnmcwovxnrvagxzdz) on 2026-10-01 via the Supabase CLI.
-- Initial grants: 11 NPCs + xwtong@163.com. Safe to re-run (idempotent).
begin;

create table if not exists public.device_access_grants (
  user_id    uuid primary key references public.voyager_profiles(id) on delete cascade,
  granted_by uuid references public.voyager_profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  note       text
);

alter table public.device_access_grants enable row level security;

drop policy if exists "device_access_grants_select_own" on public.device_access_grants;
create policy "device_access_grants_select_own"
  on public.device_access_grants for select
  using (auth.uid() = user_id);

revoke all on public.device_access_grants from anon, authenticated;
grant select on public.device_access_grants to authenticated;
grant select, insert, update, delete on public.device_access_grants to service_role;

-- Initial grants: every managed NPC, plus xwtong@163.com.
insert into public.device_access_grants (user_id, note)
select id, 'initial grant: NPC' from public.voyager_profiles where account_kind = 'npc'
on conflict (user_id) do nothing;

insert into public.device_access_grants (user_id, note)
select id, 'initial grant: back-office' from public.voyager_profiles where lower(email) = 'xwtong@163.com'
on conflict (user_id) do nothing;

commit;
