-- schema_v26: grant SELECT on voyager_orders to authenticated
-- Fixes PackTracker not showing for logged-in users (architect / voyager).
-- service_role was granted in v20, but authenticated was missing — RLS policy
-- existed but the table-level permission gate blocked all queries.

GRANT SELECT ON public.voyager_orders TO authenticated;
