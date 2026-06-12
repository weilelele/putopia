-- schema_v37: add display_url to signal_task_assets.
--   processed_url = original MP4 (source of truth, for export / social media use)
--   display_url   = animated WebP generated from the MP4 (frontend only, auto-loops
--                   as a plain <img>, no play button required)
-- Older rows keep display_url = null; the frontend falls back to processed_url.

ALTER TABLE public.signal_task_assets
  ADD COLUMN IF NOT EXISTS display_url text;
