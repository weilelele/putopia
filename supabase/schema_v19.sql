-- schema_v19: fix missing table grants on `comments`.
--
-- schema_v18 created the table with RLS enabled + policies, but never granted
-- table-level privileges to the Supabase roles. Postgres requires BOTH a GRANT
-- and a passing RLS policy, so every app read/write (which goes through the
-- service_role admin client) was failing with 42501 "permission denied for
-- table comments" — silently swallowed, making the comment feature a no-op.
--
-- Mirror the grant shape of working tables (e.g. voyager_profiles). RLS still
-- governs row visibility via the policies defined in schema_v18.

grant select, insert, update, delete on public.comments to service_role;
grant select, insert, update, delete on public.comments to authenticated;
grant select on public.comments to anon;
