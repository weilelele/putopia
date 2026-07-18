-- schema_v58.sql — per-step onboarding videos + onboarding bucket upload limits
--
-- (a) Q1 / Q2 / CTA each get an independently uploadable video. The existing
--     `video_url` column stays the Q1 (base) video; the two new columns are
--     null by default, meaning "continue the previous step's video" (the
--     resolver's chainVideos: CTA ← Q2 ← Q1 ← bundled reel).
-- (b) Give the public `onboarding` bucket an explicit 50 MB per-file limit and
--     restrict it to video MIME types. Uploads now go browser→Storage via a
--     signed URL, so this is the authoritative size/format guard (oversized or
--     non-video files fail fast with a clear Storage error instead of the
--     Supabase project default).
--
-- Idempotent; safe to re-run.

alter table public.onboarding_variants
  add column if not exists video_url_q2  text,
  add column if not exists video_url_cta text;

update storage.buckets
  set file_size_limit    = 52428800,  -- 50 MiB
      allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
  where id = 'onboarding';

