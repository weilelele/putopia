-- Grant DELETE privilege on votes to authenticated role
-- (needed for architect RLS policy to take effect on DELETE)
GRANT DELETE ON public.votes TO authenticated;
