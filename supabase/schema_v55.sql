-- schema_v55: link a signal puzzle day back to the Cosmo expansion batch it was
-- built from, so the v2 sync is idempotent.
--
-- buildCosmoSignalDay (src/lib/signal/cosmo-sync.ts) stamps the Cosmo `sessionId`
-- (one expansion batch) on the day it creates. A cron retry/overlap that would
-- otherwise build a second day from the same batch is prevented: the function
-- pre-checks and skips, and the unique index below is the race backstop. Null for
-- every hand-authored day — only the Cosmo sync sets it.

ALTER TABLE public.signal_tasks
  ADD COLUMN IF NOT EXISTS cosmo_session_id text;

-- One day per (thread, Cosmo batch). Partial so hand-authored days (null) are
-- unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS signal_tasks_thread_cosmo_session_uidx
  ON public.signal_tasks (thread_id, cosmo_session_id)
  WHERE cosmo_session_id IS NOT NULL;
