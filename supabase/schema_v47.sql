-- schema_v47: Signal Scanning outcome resolution
--
-- When a world's scan window (scan_until) closes, a resolver emails the proposer
-- once — success if a signal was tuned, otherwise a "scan came back empty"
-- failure email. scan_resolved_at is the idempotency guard so the cron and an
-- opportunistic page-view never double-send. rescanWorld clears it so a retry
-- re-resolves on the next completion.
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS scan_resolved_at TIMESTAMPTZ;

