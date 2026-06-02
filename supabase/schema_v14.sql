-- schema_v14.sql
-- Recovery queue for invites that failed to send (rate-limit / bad address).
-- Lets us re-drip invites slowly and trace the recovered cohort back to each
-- email's ORIGINAL submission date in analytics.

-- ── Queue columns on applications ──────────────────────────────────────────
-- invite_resend_status:
--   NULL      = not part of the recovery batch (sent fine originally, or duplicate row)
--   'pending' = waiting to be re-sent
--   'sent'    = re-invite dispatched successfully by us
--   'skipped' = malformed address, or auth user already exists — do not send
--   'failed'  = exceeded max attempts
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS invite_resend_status   text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_resent_at       timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_resend_error    text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_resend_attempts integer     NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_invite_resend_status_chk'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_invite_resend_status_chk
      CHECK (invite_resend_status IN ('pending', 'sent', 'skipped', 'failed'));
  END IF;
END $$;

-- ── Per-date recovery cohort stats (for the analytics panel) ───────────────
-- Keyed off applications.created_at (ORIGINAL submission date) so a re-sent
-- invite that gets registered weeks later still rolls up under its source date.
-- auth.users is not reachable via PostgREST, hence SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.recovery_cohort_stats()
RETURNS TABLE (
  submit_date date,
  total       bigint,
  resent      bigint,
  clicked     bigint,
  registered  bigint,
  failed      bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH batch AS (
    SELECT
      a.created_at::date     AS submit_date,
      lower(a.email)         AS email,
      a.invite_resend_status AS status
    FROM applications a
    WHERE a.invite_resend_status IS NOT NULL
  ),
  joined AS (
    SELECT
      b.submit_date,
      b.status,
      u.confirmed_at,
      p.registered_at
    FROM batch b
    LEFT JOIN auth.users        u ON lower(u.email) = b.email
    LEFT JOIN voyager_profiles  p ON p.id = u.id
  )
  SELECT
    submit_date,
    count(*)::bigint                                          AS total,
    count(*) FILTER (WHERE status = 'sent')::bigint           AS resent,
    count(*) FILTER (WHERE confirmed_at IS NOT NULL)::bigint  AS clicked,
    count(*) FILTER (WHERE registered_at IS NOT NULL)::bigint AS registered,
    count(*) FILTER (WHERE status = 'failed')::bigint         AS failed
  FROM joined
  GROUP BY submit_date
  ORDER BY submit_date;
$$;

GRANT EXECUTE ON FUNCTION public.recovery_cohort_stats() TO service_role;
