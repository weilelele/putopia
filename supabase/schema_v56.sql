-- schema_v56: mark when a signal day's crowd result has been emitted to Cosmo,
-- so the v2 sync emits each closed window exactly once.
--
-- emitClosedResults (src/lib/signal/cosmo-sync.ts) stamps this once it has written
-- the day's raw vote result into cosmo_requests. A cron re-run skips any day that
-- already carries the stamp — the same one-time-action pattern as recall_sent_at
-- (schema_v39). Null for every day whose window hasn't closed / been emitted.

ALTER TABLE public.signal_tasks
  ADD COLUMN IF NOT EXISTS cosmo_result_emitted_at timestamptz;
