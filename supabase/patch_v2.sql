-- Putopia — Patch v2 (safe to run even if schema.sql was partially applied)
-- Each block uses DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL END;
-- so re-running is harmless.

-- ─────────────────────────────────────────
-- Missing enum from schema.sql
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.device_knowledge AS ENUM ('known', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- New enum for v2
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.intel_tag AS ENUM ('NOTICE', 'DEVICE', 'ORG');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- devices
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devices (
  id                    text primary key,
  name                  text not null,
  batch_id              text,
  knowledge             public.device_knowledge not null,
  location              text not null,
  description           text not null,
  image_path            text,
  status                public.device_status,
  current_user_id       uuid references public.voyager_profiles(id) on delete set null,
  current_user_name     text,
  exploration_progress  integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "devices_select_voyager" ON public.devices FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role IN ('voyager', 'architect')
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "devices_all_architect" ON public.devices FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER devices_updated_at
    BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- worlds
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worlds (
  id               text primary key,
  name             text not null,
  name_en          text not null,
  discoverer_id    uuid references public.voyager_profiles(id) on delete set null,
  discoverer_name  text not null,
  discovery_date   date not null,
  gradient_from    text not null,
  gradient_to      text not null,
  description      text not null,
  is_verified      boolean not null default true,
  created_at       timestamptz not null default now()
);

ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "worlds_select_voyager" ON public.worlds FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role IN ('voyager', 'architect')
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "worlds_all_architect" ON public.worlds FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- intel
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.intel (
  id          text primary key,
  title       text not null,
  content     text not null,
  timestamp   timestamptz not null default now(),
  tag         public.intel_tag not null,
  classified  boolean not null default false,
  created_by  uuid references public.voyager_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

ALTER TABLE public.intel ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "intel_select_public" ON public.intel FOR SELECT
    USING (classified = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "intel_select_voyager" ON public.intel FOR SELECT
    USING (
      classified = true
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role IN ('voyager', 'architect')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "intel_all_architect" ON public.intel FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- stories
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stories (
  id           text primary key,
  title        text not null,
  author_id    uuid references public.voyager_profiles(id) on delete set null,
  author_name  text not null,
  date         date not null,
  tags         text[] not null default '{}',
  excerpt      text not null,
  content      text not null,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "stories_select_published" ON public.stories FOR SELECT
    USING (
      is_published = true
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role IN ('voyager', 'architect')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "stories_select_own" ON public.stories FOR SELECT
    USING (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "stories_insert_voyager" ON public.stories FOR INSERT
    WITH CHECK (
      author_id = auth.uid()
      AND is_published = false
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role IN ('voyager', 'architect')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "stories_update_own" ON public.stories FOR UPDATE
    USING (author_id = auth.uid() AND is_published = false)
    WITH CHECK (author_id = auth.uid() AND is_published = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "stories_all_architect" ON public.stories FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER stories_updated_at
    BEFORE UPDATE ON public.stories
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- Storage bucket for device images
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('devices', 'devices', true)
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "devices_storage_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'devices');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "devices_storage_insert_architect" ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'devices'
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role = 'architect'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "devices_storage_update_architect" ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'devices'
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role = 'architect'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "devices_storage_delete_architect" ON storage.objects FOR DELETE
    USING (
      bucket_id = 'devices'
      AND EXISTS (
        SELECT 1 FROM public.voyager_profiles
        WHERE id = auth.uid() AND role = 'architect'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
