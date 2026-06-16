-- ─────────────────────────────────────────
-- schema_v39: Signal Dispatch recall (re-engagement) mechanism
--
-- 24 hours after a day's puzzle is published, remind the world's prior
-- participants who haven't responded to the new day that "a new signal has
-- appeared" (doc 3.3). Timing is measured from the task's publish time.
--
--   signal_tasks.published_at   — when the task went live (the 24h reference)
--   signal_tasks.recall_sent_at — when the recall batch ran for this task (guard
--                                 so the cron doesn't re-scan it)
--   signal_recall_log           — one row per (task, user) reminded; dedup guard
-- ─────────────────────────────────────────

ALTER TABLE public.signal_tasks
  ADD COLUMN IF NOT EXISTS published_at   timestamptz,
  ADD COLUMN IF NOT EXISTS recall_sent_at timestamptz;

-- Backfill: treat already-published tasks as published at their last update so
-- the cron doesn't blast historical days. (recall_sent_at left null is fine —
-- they're all >24h old, but they have no "new" signal to announce now.)
UPDATE public.signal_tasks
  SET published_at = COALESCE(published_at, updated_at)
  WHERE is_published = true AND published_at IS NULL;

CREATE TABLE IF NOT EXISTS public.signal_recall_log (
  task_id  uuid NOT NULL REFERENCES public.signal_tasks(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES public.voyager_profiles(id) ON DELETE CASCADE,
  sent_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

ALTER TABLE public.signal_recall_log ENABLE ROW LEVEL SECURITY;

-- internal/system table — architect-only (the cron uses the service role, which
-- bypasses RLS; this policy just covers any authenticated reads).
DO $$ BEGIN
  CREATE POLICY "signal_recall_log_architect" ON public.signal_recall_log FOR ALL
    USING (EXISTS (SELECT 1 FROM public.voyager_profiles WHERE id = auth.uid() AND role = 'architect'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
