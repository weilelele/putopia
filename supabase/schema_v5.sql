-- ============================================================
-- schema_v5: Intel images + publisher fields
-- ============================================================

-- Add new columns to intel table
alter table public.intel
  add column if not exists images       text[]  not null default '{}',
  add column if not exists publisher_name text,
  add column if not exists publisher_id uuid references public.voyager_profiles(id) on delete set null;

-- ---- Storage bucket for intel images (public read) ----
insert into storage.buckets (id, name, public)
  values ('intel-images', 'intel-images', true)
  on conflict (id) do nothing;

-- Public read
create policy "intel_images_public_read"
  on storage.objects for select
  using (bucket_id = 'intel-images');

-- Architects can upload
create policy "intel_images_architect_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'intel-images'
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );

-- Architects can delete
create policy "intel_images_architect_delete"
  on storage.objects for delete
  using (
    bucket_id = 'intel-images'
    and exists (
      select 1 from public.voyager_profiles
      where id = auth.uid() and role = 'architect'
    )
  );
