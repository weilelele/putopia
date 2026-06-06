-- schema_v25: add email column to voyager_profiles
-- Stores the Supabase Auth login email for each voyager (nullable).
-- Backfills existing rows from auth.users where a match exists.

ALTER TABLE public.voyager_profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing voyagers (voyager_profiles.id = auth.users.id)
UPDATE public.voyager_profiles vp
SET email = au.email
FROM auth.users au
WHERE au.id = vp.id
  AND au.email IS NOT NULL;
