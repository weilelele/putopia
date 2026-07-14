-- schema_v48 — backfill voyager_profiles.email from auth.users
--
-- The email column was added in schema_v25 and is written by the /register
-- flow, but a cohort of profiles still has email = NULL:
--   • users created after the v25 backfill but before the register page wrote
--     the column, and
--   • shell profiles auto-created by the handle_new_user trigger (which only
--     sets id, display_name, role).
-- These users are invisible to any email-based lookup even though they have a
-- valid account (some are fully registered). Mirror auth.users.email into the
-- profile wherever it is missing. Idempotent: only touches NULL emails.

UPDATE public.voyager_profiles vp
SET email = lower(au.email)
FROM auth.users au
WHERE au.id = vp.id
  AND vp.email IS NULL
  AND au.email IS NOT NULL;
