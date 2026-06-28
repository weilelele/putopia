-- schema_v53: Final Form — the media that graduates a world from Signal Tuning
-- to an Established (Archive) World.
--
-- A world's "final form" is one or more images/videos representing how the world
-- was finally observed. Adding it is the missing EXIT from Signal Tuning: once an
-- architect graduates the world, lifecycle_state → 'stable' and the first asset's
-- poster (a video's first frame, or the image itself) becomes worlds.image_path,
-- the list poster. The Archive World page then plays the final form and lets you
-- page back through each day's chosen signal to the initial vision.
CREATE TABLE IF NOT EXISTS public.world_final_assets (
  id           uuid primary key default gen_random_uuid(),
  world_id     text not null references public.worlds(id) on delete cascade,
  media        text not null default 'image',   -- 'image' | 'video'
  url          text not null,                    -- the asset's public URL
  poster_url   text,                             -- video first-frame still (= url for images)
  storage_path text,                             -- storage object path; null for external
  sort_order   integer not null default 0,       -- carousel order within a world
  created_at   timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS world_final_assets_world_idx ON public.world_final_assets (world_id);

ALTER TABLE public.world_final_assets ENABLE ROW LEVEL SECURITY;

-- Public, like the worlds it belongs to (the app reads via the service role).
DO $$ BEGIN
  CREATE POLICY "world_final_assets_read" ON public.world_final_assets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only architects curate.
DO $$ BEGIN
  CREATE POLICY "world_final_assets_architect" ON public.world_final_assets FOR ALL
    USING (EXISTS (SELECT 1 FROM public.voyager_profiles WHERE id = auth.uid() AND role = 'architect'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
