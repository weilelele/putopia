-- schema_v51: Signal Tuning inter-question gap
--
-- Replaces the single `reveal_interval_hours` cadence with a fixed 24h voting
-- window per question + a configurable inter-question gap. A question is OPEN
-- for 24h, then CLOSED for `gap_hours` before the next question opens. The open
-- chain is derived from this column + each task's existing `published_at`
-- (see docs/signal-tuning-timing.md, src/lib/signal/reveal.ts buildSchedule).
--
-- NOT NULL DEFAULT 4 takes over every existing thread automatically (decision 7).
-- `reveal_interval_hours` is superseded for member gating and left in place only
-- to avoid breaking legacy rows; it will be retired in a later cleanup.
ALTER TABLE public.signal_threads
  ADD COLUMN IF NOT EXISTS gap_hours INTEGER NOT NULL DEFAULT 4;
