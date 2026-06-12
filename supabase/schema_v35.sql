-- schema_v35: A/B experiment group assignment for Voyager Pack access test
--
-- Two groups:
--   direct     — Voyager Pack card shown immediately in device registry, no task gate
--   task_gated — user must complete 4 applicant tasks before pack access is shown
--
-- Assignment is done server-side on first console visit (50/50 random).
-- Null = not yet assigned (assigned lazily to avoid touching all existing rows).

ALTER TABLE public.voyager_profiles
  ADD COLUMN IF NOT EXISTS experiment_group text
  CHECK (experiment_group IN ('direct', 'task_gated'));

-- Index for fast reads in server actions
CREATE INDEX IF NOT EXISTS voyager_profiles_experiment_group_idx
  ON public.voyager_profiles (experiment_group)
  WHERE experiment_group IS NOT NULL;
