-- schema_v33: Signal Tasks (每日信号解谜 / daily signal puzzles)
--
-- Architect authors a puzzle (hand-written prompt) sourced from Cosmo frequencies/bands.
-- The generator batch-fetches assets, crops + glitches them into a CANDIDATE POOL
-- (signal_task_assets), then the Architect hand-picks which candidates go live
-- (is_selected = true). Users file a response (no right/wrong — crowd-sourced signal),
-- and only see the aggregate distribution after they themselves submit.
--
-- This is the data layer for Phase 4 of docs/system-design.md, extended with the
-- generate→curate workflow and per-asset crop config (shape / ratio / glitch).
--
-- Conventions: if-not-exists / DO-duplicate_object idempotent, explicit grants,
-- reuse public.set_updated_at() trigger.

-- ─────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.signal_task_type AS ENUM ('visual_match', 'visual_odd_one', 'audio_odd_one');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.signal_asset_media AS ENUM ('image', 'video', 'audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- signal_tasks — one puzzle (the hand-written question)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signal_tasks (
  id           uuid primary key default gen_random_uuid(),
  task_date    date not null,                       -- which day this puzzle is scheduled for
  type         public.signal_task_type not null,
  prompt       text,                                -- hand-written 题干
  is_published boolean not null default false,      -- draft until Architect publishes
  sort_order   integer not null default 0,          -- order within a day
  created_by   uuid references public.voyager_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS signal_tasks_date_idx ON public.signal_tasks (task_date);

ALTER TABLE public.signal_tasks ENABLE ROW LEVEL SECURITY;

-- Published puzzles are visible to any signed-in member (Applicant can view).
DO $$ BEGIN
  CREATE POLICY "signal_tasks_select_published" ON public.signal_tasks FOR SELECT
    USING (is_published = true AND auth.uid() is not null);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signal_tasks_all_architect" ON public.signal_tasks FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER signal_tasks_updated_at
    BEFORE UPDATE ON public.signal_tasks
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- signal_task_assets — candidate pool + curation
-- ─────────────────────────────────────────
-- Every generated candidate lands here. Architect flips is_selected on the few that
-- go live. Only is_selected rows under a published task are exposed to members.
--
-- crop_config jsonb shape (per asset):
--   {
--     "shape": "square" | "circle" | "rect",
--     "areaRatio": 0.18,                 -- fraction of source frame area (default 1/6–1/5)
--     "aspect": "1:1",                   -- when shape = rect
--     "position": { "x": 0.42, "y": 0.6 } | "random",
--     "box": { "left": 320, "top": 180, "width": 256, "height": 256 },  -- resolved px
--     "glitchIntensity": 55              -- 0–100
--   }
CREATE TABLE IF NOT EXISTS public.signal_task_assets (
  id                  uuid primary key default gen_random_uuid(),
  task_id             uuid not null references public.signal_tasks(id) on delete cascade,
  media               public.signal_asset_media not null,

  -- where it came from in Cosmo (for audit / regenerate)
  source_channel_id   text,        -- Cosmo channel._id
  source_channel_name text,        -- denormalized freq/world name
  source_freq         numeric,     -- Cosmo channel.freq
  source_band_id      text,        -- Cosmo band._id
  source_band_name    text,
  source_asset_id     text,        -- Cosmo ai-image / ai-video _id
  source_url          text,        -- original Cosmo URL (pre-processing)

  -- processed result stored in the signal-assets bucket
  processed_path      text,        -- storage object path
  processed_url       text,        -- public URL after crop + glitch (image/audio clip)

  crop_config         jsonb not null default '{}',

  -- structural role within the puzzle (NOT an answer key — no right/wrong here).
  -- 'main' = the reference shown prominently (visual_match); 'option' = a choice.
  asset_role          text not null default 'option',

  is_selected         boolean not null default false,  -- curated to go live
  display_order       integer not null default 0,
  created_at          timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS signal_task_assets_task_idx ON public.signal_task_assets (task_id);

ALTER TABLE public.signal_task_assets ENABLE ROW LEVEL SECURITY;

-- Members see only selected assets of a published task.
DO $$ BEGIN
  CREATE POLICY "signal_task_assets_select_live" ON public.signal_task_assets FOR SELECT
    USING (
      is_selected = true
      AND auth.uid() is not null
      AND EXISTS (
        SELECT 1 FROM public.signal_tasks t
        WHERE t.id = task_id AND t.is_published = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signal_task_assets_all_architect" ON public.signal_task_assets FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- signal_responses — a member's filing (no right/wrong)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signal_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.voyager_profiles(id) on delete cascade,
  task_id     uuid not null references public.signal_tasks(id) on delete cascade,
  selected_asset_id uuid not null references public.signal_task_assets(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, task_id)               -- one filing per member per puzzle
);
CREATE INDEX IF NOT EXISTS signal_responses_task_idx ON public.signal_responses (task_id);

ALTER TABLE public.signal_responses ENABLE ROW LEVEL SECURITY;

-- Members can read only their own filing (distribution is served via service_role aggregate).
DO $$ BEGIN
  CREATE POLICY "signal_responses_select_own" ON public.signal_responses FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only Voyager+ may file (Applicants can view but not participate).
DO $$ BEGIN
  CREATE POLICY "signal_responses_insert_voyager" ON public.signal_responses FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role IN ('voyager', 'architect')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signal_responses_all_architect" ON public.signal_responses FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- Grants (PostREST roles need explicit grants — direct DDL tables don't inherit)
-- ─────────────────────────────────────────
GRANT ALL ON TABLE public.signal_tasks       TO service_role;
GRANT ALL ON TABLE public.signal_task_assets TO service_role;
GRANT ALL ON TABLE public.signal_responses   TO service_role;

GRANT SELECT ON TABLE public.signal_tasks       TO anon, authenticated;
GRANT SELECT ON TABLE public.signal_task_assets TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.signal_responses TO authenticated;

-- ─────────────────────────────────────────
-- Storage bucket: signal-assets (processed crops / glitched images / audio clips)
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signal-assets',
  'signal-assets',
  true,
  20971520,  -- 20 MB
  array['image/webp','image/png','image/jpeg','video/mp4','audio/mpeg','audio/mp4','audio/wav','audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "signal_assets_storage_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'signal-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "signal_assets_storage_write_architect" ON storage.objects FOR ALL
    USING (
      bucket_id = 'signal-assets'
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role = 'architect'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
