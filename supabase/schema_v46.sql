-- schema_v46: test worlds (end-to-end Signal Scanning testing)
--
-- Worlds filed from the hidden /worlds/test-submit console are flagged is_test so
-- the full submit → scan → ready/failed flow can be exercised against the live
-- DB without polluting the real World Records. The public listings exclude them
-- (filtered in app code so a missing column never breaks the page).
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
