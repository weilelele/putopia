-- schema_v62.sql -- Retire Signal Dispatch's automatic Voyager Log posts.
--
-- Older preview deployments still share the production database and may still
-- contain the retired writer. Keep existing invalid rows temporarily so they
-- can be cleaned up separately, while rejecting every new/updated published
-- story that has no YouTube video ID.

alter table public.stories
  drop constraint if exists stories_published_requires_youtube;

alter table public.stories
  add constraint stories_published_requires_youtube
  check (
    not is_published
    or nullif(btrim(youtube_id), '') is not null
  ) not valid;
