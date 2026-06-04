-- schema_v20: onboarding variants (UTM-driven, admin-editable)
-- Stores per-ad-group onboarding copy + video. The default row (match_key = '')
-- holds the baseline copy; variant rows override only the fields they set
-- (null = inherit from default). Resolved by utm_content at /new.

create table if not exists public.onboarding_variants (
  id             uuid primary key default gen_random_uuid(),
  match_key      text not null unique,         -- '' = default; otherwise lowercased utm_content token (e.g. 'a3')
  label          text not null,                -- display label (e.g. 'DEFAULT', 'A3')
  q1_headline    text,
  q2_headline    text,
  affirm_line1   text,
  affirm_line2   text,
  cta_invitation text,
  cta_label      text,
  video_url      text,
  sort_order     integer not null default 0,
  enabled        boolean not null default true,
  updated_at     timestamptz not null default now()
);

-- Table privileges (direct DDL does not inherit Supabase default grants).
grant all    on table public.onboarding_variants to service_role;
grant select on table public.onboarding_variants to anon, authenticated;

-- RLS: public read (so the public /new page can resolve copy); writes go
-- through service-role server actions, which bypass RLS.
alter table public.onboarding_variants enable row level security;

drop policy if exists "onboarding_variants_select" on public.onboarding_variants;
create policy "onboarding_variants_select"
  on public.onboarding_variants for select
  using (true);

-- ---------- Storage bucket for onboarding videos ----------
insert into storage.buckets (id, name, public)
values ('onboarding', 'onboarding', true)
on conflict (id) do nothing;

drop policy if exists "onboarding_storage_select" on storage.objects;
create policy "onboarding_storage_select"
  on storage.objects for select
  using (bucket_id = 'onboarding');

drop policy if exists "onboarding_storage_insert_architect" on storage.objects;
create policy "onboarding_storage_insert_architect"
  on storage.objects for insert
  with check (
    bucket_id = 'onboarding'
    and exists (select 1 from public.voyager_profiles where id = auth.uid() and role = 'architect')
  );

drop policy if exists "onboarding_storage_update_architect" on storage.objects;
create policy "onboarding_storage_update_architect"
  on storage.objects for update
  using (
    bucket_id = 'onboarding'
    and exists (select 1 from public.voyager_profiles where id = auth.uid() and role = 'architect')
  );

drop policy if exists "onboarding_storage_delete_architect" on storage.objects;
create policy "onboarding_storage_delete_architect"
  on storage.objects for delete
  using (
    bucket_id = 'onboarding'
    and exists (select 1 from public.voyager_profiles where id = auth.uid() and role = 'architect')
  );

-- ---------- Seed: default + A3 + S1 ----------
-- Default row = current baseline copy. Variant rows override only what differs.
insert into public.onboarding_variants
  (match_key, label, q1_headline, q2_headline, affirm_line1, affirm_line2, cta_invitation, cta_label, video_url, sort_order)
values
  ('', 'DEFAULT',
   'How strongly do you feel that another version of your life exists right now?',
   'Which parallel world are you most hoping to find?',
   'Yes, it''s you.',
   'You are the Voyager we''ve been looking for.',
   'Leave your email below to apply for your seat in our collective and secure your Multiverse Console.',
   'CONFIRM MY VOYAGER IDENTITY',
   '/assets/device-reel.mp4',
   0),
  ('a3', 'A3',
   null, null, null, null,
   'Become an operator. Observe fictional worlds through a recovered physical Console. Leave your email to begin operator intake.',
   'Apply as a Voyager',
   null,
   1),
  ('s1', 'S1',
   null, null,
   'A signal from a distant world is looking for its first operators.',
   'Receive the first transmission.',
   null, null, null,
   2)
on conflict (match_key) do nothing;
