-- Putopia schema_v4 — Apply form simplification + worlds image
-- Run in Supabase SQL Editor

-- 1. Make applications.name optional (form no longer collects it)
ALTER TABLE public.applications
  ALTER COLUMN name SET DEFAULT '',
  ALTER COLUMN name DROP NOT NULL;

-- 2. The existing `location` column stores world_preference answer.
--    No schema change needed — column already exists as text nullable.

-- 3. Add image_path to worlds table (optional; gradient is fallback)
ALTER TABLE public.worlds
  ADD COLUMN IF NOT EXISTS image_path text;
