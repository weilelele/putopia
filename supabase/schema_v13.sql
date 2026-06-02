-- schema_v13.sql

-- Add per-day confirmed auth users helper for daily analytics breakdown
CREATE OR REPLACE FUNCTION public.count_confirmed_auth_users_by_day(days_back integer)
RETURNS TABLE(day date, cnt bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    confirmed_at::date AS day,
    count(*)::bigint   AS cnt
  FROM auth.users
  WHERE confirmed_at IS NOT NULL
    AND email NOT LIKE '%@putopia.internal'
    AND confirmed_at >= (CURRENT_DATE - days_back)
  GROUP BY confirmed_at::date
  ORDER BY day DESC;
$$;

GRANT EXECUTE ON FUNCTION public.count_confirmed_auth_users_by_day(integer) TO service_role;

-- Add submission_count for dedup tracking; normalize email to lowercase
alter table public.applications
  add column if not exists submission_count integer not null default 1;

-- Normalize existing emails to lowercase
update public.applications set email = lower(email) where email != lower(email);
