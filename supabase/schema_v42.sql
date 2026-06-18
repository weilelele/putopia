-- schema_v42: scheduled day reveal for Signal Tuning
--
-- Days are configured ahead of time but surface one at a time. The thread's
-- reveal_anchor_at (set when its first day is published) is the schedule origin;
-- the day at day_index=k reveals at anchor + k * reveal_interval_hours.
ALTER TABLE signal_threads ADD COLUMN IF NOT EXISTS reveal_anchor_at TIMESTAMPTZ;
ALTER TABLE signal_threads ADD COLUMN IF NOT EXISTS reveal_interval_hours INTEGER NOT NULL DEFAULT 24;
