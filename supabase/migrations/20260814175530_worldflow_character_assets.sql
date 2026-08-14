-- Bind local image uploads to a specific character. Character records remain
-- inside the evolvable workflow JSON; this column stores their stable UUID.
alter table public.worldflow_assets
  add column if not exists character_id text;

create index if not exists worldflow_assets_world_character_idx
  on public.worldflow_assets (world_id, character_id, created_at desc)
  where character_id is not null;

create index if not exists worldflow_assets_uploaded_by_idx
  on public.worldflow_assets (uploaded_by);
