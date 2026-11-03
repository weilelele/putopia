-- v112: one video attachment per Intel post.
-- Additive: apply before deploying the Intel video upload. Existing posts keep their images and gain null video fields.
-- Videos and their cover frames are stored in the existing public `intel-images` bucket under `<intel id>/`,
-- uploaded by architects through the same storage policies as images (schema_v5).
begin;

alter table public.intel add column if not exists video_url text;
alter table public.intel add column if not exists video_poster_url text;

comment on column public.intel.video_url is 'Public storage URL of the post''s MP4 (H.264/AAC) video, or null.';
comment on column public.intel.video_poster_url is 'Public storage URL of a still frame shown before the video plays, or null.';

alter table public.intel drop constraint if exists intel_video_urls_https;
alter table public.intel add constraint intel_video_urls_https check (
  (video_url is null or video_url ~ '^https://')
  and (video_poster_url is null or (video_url is not null and video_poster_url ~ '^https://'))
);

-- The bucket was created without type or size restrictions. If either has since been set
-- in the dashboard, let MP4 through and allow the app's 50 MB video cap.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'video/mp4')
where id = 'intel-images'
  and allowed_mime_types is not null
  and not ('video/mp4' = any(allowed_mime_types));

update storage.buckets
set file_size_limit = 52428800
where id = 'intel-images'
  and file_size_limit is not null
  and file_size_limit < 52428800;

commit;
