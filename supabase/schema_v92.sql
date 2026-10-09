-- Deferred roster checks run after Auth's SECURITY DEFINER bootstrap returns.
-- Run this read-only invariant check as its owner, without granting Auth access
-- to membership tables. Keep the existing constraint checks intact.
begin;
alter function public.check_npc_roster_consistency() security definer;
alter function public.check_npc_roster_consistency() set search_path = pg_catalog, public, pg_temp;
revoke all on function public.check_npc_roster_consistency() from public, anon, authenticated;
commit;
