-- schema_v30: comment image attachments
-- Adds image_paths[] to comments so users can attach up to 3 images per transmission.
-- Creates the comment-images Storage bucket (public, 5 MB limit).

-- 1. Column
alter table comments
  add column if not exists image_paths text[] not null default '{}';

-- 2. Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comment-images',
  'comment-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- 3. RLS: any authenticated user can upload to their own subfolder
create policy "comment_images_upload_auth"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'comment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Public read (bucket is already public, but make it explicit)
create policy "comment_images_read_public"
  on storage.objects for select
  using (bucket_id = 'comment-images');
