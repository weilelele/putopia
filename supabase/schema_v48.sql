-- schema_v48: inter-day "Signal Searching" windows
--
-- After a revealed day, the next day is gated behind a random 8-20h search
-- window (not a fixed interval). next_search_until is the end of the CURRENT
-- window for a thread; when it elapses the next published day unlocks and a fresh
-- window rolls. If no next day is published when it elapses, the world shows a
-- "search came up empty" state until an Architect adds the day.
ALTER TABLE public.signal_threads ADD COLUMN IF NOT EXISTS next_search_until TIMESTAMPTZ;
