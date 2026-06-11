-- schema_v34: Signal Task "investigation threads" — the natural day-to-day evolution.
--
-- A thread is a multi-day investigation of one signal. Each day is a signal_tasks row
-- linked by thread_id + day_index. The thread carries the HIDDEN ground truth (which
-- source is the genuine target) plus clarity/drift state:
--   - crowd majority == target  → converge: next day clearer (glitch ↓), clarity +1
--   - crowd majority != target  → diverge:  next day noisier, drift +1
-- On clarity_max → status 'locked' (auto-tie to a world). On drift_max → 'lost'.
--
-- is_target on assets is the hidden answer and is NEVER sent to the client (getSignalFeed
-- selects only safe columns).

-- ─────────────────────────────────────────
-- signal_threads
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signal_threads (
  id                  uuid primary key default gen_random_uuid(),
  title               text,
  type                public.signal_task_type not null,

  -- the "group" source: where most options come from
  group_channel_id    text,
  group_channel_name  text,
  group_freq          numeric,
  group_band_id       text,
  group_band_name     text,

  -- the hidden "target" source: the genuine odd-one / true channel
  target_channel_id   text,
  target_channel_name text,
  target_freq         numeric,
  target_band_id      text,
  target_band_name    text,

  option_count        integer not null default 4,
  clarity             integer not null default 0,
  clarity_max         integer not null default 4,
  drift               integer not null default 0,
  drift_max           integer not null default 3,
  status              text not null default 'open',   -- open | locked | lost
  world_id            text references public.worlds(id) on delete set null,

  created_by          uuid references public.voyager_profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

ALTER TABLE public.signal_threads ENABLE ROW LEVEL SECURITY;

-- threads are internal (carry the hidden answer) → architect only
DO $$ BEGIN
  CREATE POLICY "signal_threads_all_architect" ON public.signal_threads FOR ALL
    USING (EXISTS (SELECT 1 FROM public.voyager_profiles WHERE id = auth.uid() AND role = 'architect'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER signal_threads_updated_at
    BEFORE UPDATE ON public.signal_threads
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- signal_tasks: link into a thread + day chain
-- ─────────────────────────────────────────
ALTER TABLE public.signal_tasks
  ADD COLUMN IF NOT EXISTS thread_id    uuid references public.signal_threads(id) on delete set null,
  ADD COLUMN IF NOT EXISTS day_index    integer not null default 0,
  ADD COLUMN IF NOT EXISTS prev_task_id uuid references public.signal_tasks(id) on delete set null;

CREATE INDEX IF NOT EXISTS signal_tasks_thread_idx ON public.signal_tasks (thread_id);

-- ─────────────────────────────────────────
-- signal_task_assets: hidden ground truth
-- ─────────────────────────────────────────
ALTER TABLE public.signal_task_assets
  ADD COLUMN IF NOT EXISTS is_target boolean not null default false;

-- ─────────────────────────────────────────
-- grants
-- ─────────────────────────────────────────
GRANT ALL ON TABLE public.signal_threads TO service_role;
-- no anon/authenticated grant: threads carry the hidden answer; the member feed
-- reads safe fields via the service-role action only.
