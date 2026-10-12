-- Removes the placeholder observation/anomaly reports so reports can be added by hand.
-- Only rows with source = 'seed' are deleted; real and architect-filed reports are kept.
-- The seeded discussion comments are NOT touched.
-- To restore: re-run supabase/seed_world_social.sql (idempotent; its comment inserts are no-ops).
begin;
delete from public.world_reports where source = 'seed';
commit;
