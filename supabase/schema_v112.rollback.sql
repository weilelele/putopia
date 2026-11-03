-- Roll back v112. Drops the video columns, so any Intel video links are lost
-- (the files stay in the `intel-images` bucket). Bucket settings are left as they are:
-- v112 only widened them when they were already restricted, and a wider bucket is harmless.
begin;
alter table public.intel drop constraint if exists intel_video_urls_https;
alter table public.intel drop column if exists video_poster_url;
alter table public.intel drop column if exists video_url;
commit;
