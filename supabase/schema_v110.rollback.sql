-- Rollback for schema_v110 (auth.users statistics RPCs locked to service_role).
-- Restores the previous grants, which re-expose the functions to anon and
-- authenticated. Only use this if a caller outside service_role turns up.
begin;

grant execute on function public.confirmed_auth_users_by_day(timestamptz)   to public, anon, authenticated;
grant execute on function public.count_confirmed_auth_users()               to public, anon, authenticated;
grant execute on function public.count_confirmed_auth_users_30d(timestamptz) to public, anon, authenticated;
grant execute on function public.count_confirmed_auth_users_by_day(integer)  to public, anon, authenticated;
grant execute on function public.recovery_cohort_stats()                     to public, anon, authenticated;

commit;
