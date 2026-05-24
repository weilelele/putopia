-- schema_v8: change votes.scope from vote_scope enum to text[]
-- This allows a vote to target specific combinations of roles (multi-scope).

-- Drop RLS policies that reference scope as enum (reads use admin client anyway)
DROP POLICY IF EXISTS "votes_select_public"    ON public.votes;
DROP POLICY IF EXISTS "votes_select_applicant" ON public.votes;
DROP POLICY IF EXISTS "votes_select_voyager"   ON public.votes;

-- Drop default before changing column type (Postgres can't auto-cast enum default to text[])
ALTER TABLE public.votes ALTER COLUMN scope DROP DEFAULT;

-- Convert scope column from enum to text[]
ALTER TABLE public.votes
  ALTER COLUMN scope TYPE text[]
  USING ARRAY[scope::text];

-- Expand old hierarchical single values into explicit role arrays
UPDATE public.votes SET scope = ARRAY['applicant', 'voyager', 'architect']
  WHERE scope = ARRAY['public'] OR scope = ARRAY['applicant'];
UPDATE public.votes SET scope = ARRAY['voyager', 'architect']
  WHERE scope = ARRAY['voyager'];
-- ARRAY['architect'] stays unchanged

-- Restore default with new type
ALTER TABLE public.votes
  ALTER COLUMN scope SET DEFAULT ARRAY['applicant', 'voyager', 'architect']::text[];
