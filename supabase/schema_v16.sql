-- schema_v16.sql — Voyager batches
-- Adds a free-text batch label to voyager_profiles (cohort grouping, like a class).
-- NOT NULL DEFAULT backfills every existing row to 'Original Batch' automatically,
-- and new sign-ups land there until an admin reassigns them.
ALTER TABLE public.voyager_profiles
  ADD COLUMN IF NOT EXISTS batch_label text NOT NULL DEFAULT 'Original Batch';
