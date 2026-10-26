-- Read-only audit for anonymous sessions (run before and after schema_v104).
-- Anonymous Supabase users use the `authenticated` role. Each result row is
-- something an anonymous session could reach that a logged-out visitor cannot.

-- 1. Public tables without RLS that `authenticated` can touch but `anon` cannot.
select c.relname as table_without_rls, p.privilege_type
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral (select unnest(array['SELECT','INSERT','UPDATE','DELETE']) as privilege_type) p
where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  and has_table_privilege('authenticated', c.oid, p.privilege_type)
  and not has_table_privilege('anon', c.oid, p.privilege_type)
order by 1, 2;

-- 2. Permissive policies granted to `authenticated` (or everyone) on tables
--    where no anonymous guard exists for that command.
select pol.schemaname, pol.tablename, pol.policyname, pol.cmd, pol.roles, pol.qual, pol.with_check
from pg_policies pol
where pol.schemaname in ('public', 'storage') and pol.permissive = 'PERMISSIVE'
  and (pol.roles && array['authenticated', 'public']::name[])
  and not exists (
    select 1 from pg_policies g
    where g.schemaname = pol.schemaname and g.tablename = pol.tablename and g.permissive = 'RESTRICTIVE'
      and g.policyname like 'anonymous_no_%'
      and (g.cmd = pol.cmd or (pol.cmd = 'ALL' and g.cmd in ('INSERT', 'UPDATE', 'DELETE')))
  )
  and (pol.qual is null or pol.qual not like '%auth.uid()%' or pol.qual like '%auth.uid() IS NOT NULL%')
order by 2, 3;

-- 3. SECURITY DEFINER functions in public that `authenticated` may execute.
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'EXECUTE')
order by 1;
