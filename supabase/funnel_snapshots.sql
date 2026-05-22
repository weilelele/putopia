-- Funnel conversion snapshots
-- Each cron run inserts one row per funnel step, all sharing the same run_id.

CREATE TABLE IF NOT EXISTS public.funnel_snapshots (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         uuid        NOT NULL,
  captured_at    timestamptz NOT NULL DEFAULT now(),
  version_tag    text,
  step_key       text        NOT NULL,
  step_label     text        NOT NULL,
  step_order     int         NOT NULL,
  count_all_time int         NOT NULL DEFAULT 0,
  count_30d      int         NOT NULL DEFAULT 0,
  UNIQUE (run_id, step_key)
);

CREATE INDEX IF NOT EXISTS funnel_snapshots_captured_at_idx
  ON public.funnel_snapshots (captured_at DESC);

CREATE INDEX IF NOT EXISTS funnel_snapshots_run_id_idx
  ON public.funnel_snapshots (run_id);

ALTER TABLE public.funnel_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_snapshots_select_architect"
  ON public.funnel_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    )
  );
