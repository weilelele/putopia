-- Device Update images/video. Apply before enabling uploads in production.
-- Private objects: the application grants reads only to Architects or published media.
-- No client INSERT policy: Architect-only server actions sign unique upload paths.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'device-update-media', 'device-update-media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;
