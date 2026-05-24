-- schema_v9: add voter_name to vote_responses
-- Denormalized display name so vote history stays readable even if profile is deleted.
ALTER TABLE public.vote_responses ADD COLUMN IF NOT EXISTS voter_name text;
