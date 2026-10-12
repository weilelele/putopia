-- Drop the retired Story Lab objects created in schema_v63.sql.
-- Application code stopped reading or writing them in #200. No cascade: if an
-- unknown object still depends on these tables, the migration fails instead of
-- silently dropping it. Export the tables first if their rows should be kept;
-- re-running schema_v63.sql restores the structure but not the data.
begin;
drop table if exists public.story_publications;
drop table if exists public.device_batch_story_content_items;
drop table if exists public.device_batch_story_workflows;
drop function if exists public.replace_story_content_plan(uuid, integer, integer, uuid, jsonb);
drop function if exists public.invalidate_story_content_after_upstream_change();
commit;
