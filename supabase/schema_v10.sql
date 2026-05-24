-- schema_v10.sql
-- Add registered_at to voyager_profiles to track true account completion
-- (distinct from joined_at which is set by trigger on invite, before user ever clicks the link)

ALTER TABLE public.voyager_profiles
  ADD COLUMN IF NOT EXISTS registered_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.voyager_profiles.registered_at IS
  'Set when the user completes /register (sets password + display name). NULL = invite pending or never completed.';

-- ── Helper: count auth users who have confirmed their email (clicked the invite link) ──
-- auth.users is not accessible via PostgREST, so we expose a SECURITY DEFINER function.
-- Excludes internal putopia service accounts.

CREATE OR REPLACE FUNCTION public.count_confirmed_auth_users()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM auth.users
  WHERE confirmed_at IS NOT NULL
    AND email NOT LIKE '%@putopia.internal';
$$;

CREATE OR REPLACE FUNCTION public.count_confirmed_auth_users_30d(cutoff timestamptz)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM auth.users
  WHERE confirmed_at IS NOT NULL
    AND confirmed_at >= cutoff
    AND email NOT LIKE '%@putopia.internal';
$$;

GRANT EXECUTE ON FUNCTION public.count_confirmed_auth_users()          TO service_role;
GRANT EXECUTE ON FUNCTION public.count_confirmed_auth_users_30d(timestamptz) TO service_role;
