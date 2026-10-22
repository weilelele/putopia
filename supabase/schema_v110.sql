-- Lock the auth.users statistics RPCs to service_role.
-- NOT APPLIED to production. Safe to apply before or after deploying the app.
--
-- These SECURITY DEFINER functions (schema_v10, v13, v14, v52) read auth.users.
-- Their migrations granted EXECUTE to service_role but never revoked the
-- default PUBLIC grant, so anon and authenticated could call them through
-- PostgREST with the public anon key and read signup and recovery statistics.
-- The only callers (/admin/analytics and /api/analytics/snapshot) use the
-- service-role client, so they are unaffected.
begin;

revoke execute on function public.confirmed_auth_users_by_day(timestamptz)   from public, anon, authenticated;
revoke execute on function public.count_confirmed_auth_users()               from public, anon, authenticated;
revoke execute on function public.count_confirmed_auth_users_30d(timestamptz) from public, anon, authenticated;
revoke execute on function public.count_confirmed_auth_users_by_day(integer)  from public, anon, authenticated;
revoke execute on function public.recovery_cohort_stats()                     from public, anon, authenticated;

grant execute on function public.confirmed_auth_users_by_day(timestamptz)   to service_role;
grant execute on function public.count_confirmed_auth_users()               to service_role;
grant execute on function public.count_confirmed_auth_users_30d(timestamptz) to service_role;
grant execute on function public.count_confirmed_auth_users_by_day(integer)  to service_role;
grant execute on function public.recovery_cohort_stats()                     to service_role;

commit;

-- Verify (expect false for anon/authenticated, true for service_role):
-- select p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'execute')
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- cross join (values ('anon'), ('authenticated'), ('service_role')) r(rolname)
-- where n.nspname = 'public' and p.proname in ('confirmed_auth_users_by_day',
--   'count_confirmed_auth_users', 'count_confirmed_auth_users_30d',
--   'count_confirmed_auth_users_by_day', 'recovery_cohort_stats')
-- order by 1, 2;
