-- schema_v44: assign experiment_group at profile-creation time
--
-- Previously, experiment_group was lazily assigned on first console visit.
-- Now it is assigned at registration so every member immediately lands in
-- group A (direct) or group B (task_gated), guaranteeing all members see
-- at least one version of the membership ad slot.
--
-- 1) Patch the handle_new_user trigger to include a random 50/50 split.
-- 2) Backfill all existing rows that were created before this migration.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.voyager_profiles (id, display_name, role, email, experiment_group)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'applicant',
    LOWER(NEW.email),
    CASE WHEN random() < 0.5 THEN 'direct' ELSE 'task_gated' END
  );
  RETURN NEW;
END;
$$;

-- Backfill: assign every row that is still NULL (created before v44),
-- architects included, so the experiment runs uniformly across all members.
UPDATE public.voyager_profiles
SET experiment_group = CASE WHEN random() < 0.5 THEN 'direct' ELSE 'task_gated' END
WHERE experiment_group IS NULL;
