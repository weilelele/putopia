-- Putopia Collective — Schema v3
-- Run AFTER schema_v2.sql
-- Adds: Storage bucket for device images

insert into storage.buckets (id, name, public)
values ('devices', 'devices', true)
on conflict do nothing;

-- Public read for device images
create policy "devices_storage_select"
  on storage.objects for select
  using (bucket_id = 'devices');

-- Architects can upload device images
create policy "devices_storage_insert_architect"
  on storage.objects for insert
  with check (
    bucket_id = 'devices'
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- Architects can update (replace) device images
create policy "devices_storage_update_architect"
  on storage.objects for update
  using (
    bucket_id = 'devices'
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- Architects can delete device images
create policy "devices_storage_delete_architect"
  on storage.objects for delete
  using (
    bucket_id = 'devices'
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );
