-- schema_v24: grant INSERT/UPDATE on votes to authenticated role
-- Base schema enabled RLS + the votes_all_architect policy but never granted
-- INSERT/UPDATE, so createVote() (which runs as the authenticated role, not the
-- admin client) failed at the GRANT layer with "permission denied for table votes"
-- before RLS could even evaluate. schema_v15 previously patched DELETE the same way.
-- The architect-only gate still comes from the votes_all_architect RLS policy.
GRANT INSERT, UPDATE ON public.votes TO authenticated;
