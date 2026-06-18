-- schema_v41: world-confirmed email guard
--
-- When a world's FIRST Signal Tuning day is published, we email the original
-- proposer ("your world really exists"). Stamp the send so re-publishing a day
-- (or publishing later days) never re-sends. One email per world, ever.
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS confirm_email_sent_at TIMESTAMPTZ;
