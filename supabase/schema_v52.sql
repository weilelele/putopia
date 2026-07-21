-- schema_v52 — per-day confirmed auth users (for the single-day analytics board)
--
-- The funnel dashboard's "Invite Link Clicked" step counts confirmed auth.users
-- (email confirmed = invite link opened). count_confirmed_auth_users() returns a
-- single all-time total; the new single-day board needs the same number bucketed
-- by the UTC day the user confirmed. auth.users is not reachable through PostREST,
-- so expose it via a SECURITY DEFINER RPC, mirroring count_confirmed_auth_users().
--
-- `cutoff` bounds the scan to the days the board renders. Day is the UTC calendar
-- date of confirmed_at, to line up with the PostHog steps (HogQL toDate() = UTC).

CREATE OR REPLACE FUNCTION public.confirmed_auth_users_by_day(cutoff timestamptz)
RETURNS TABLE (
  day date,
  cnt bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (confirmed_at AT TIME ZONE 'UTC')::date AS day,
    count(*)::bigint                        AS cnt
  FROM auth.users
  WHERE confirmed_at IS NOT NULL
    AND confirmed_at >= cutoff
    AND email NOT LIKE '%@putopia.internal'
  GROUP BY 1
  ORDER BY 1;
$$;
