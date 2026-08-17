-- Worldflow can associate an existing server-side asset without copying the
-- underlying file. Local uploads keep their private Storage object; cloud rows
-- point at a trusted asset record selected by the server.
alter table public.worldflow_assets
  alter column storage_path drop not null,
  alter column file_size drop not null,
  add column if not exists source_type text not null default 'local',
  add column if not exists source_provider text,
  add column if not exists source_asset_id text,
  add column if not exists source_url text;

alter table public.worldflow_assets
  add constraint worldflow_assets_source_type_check
    check (source_type in ('local', 'cloud')),
  add constraint worldflow_assets_source_shape_check
    check (
      (source_type = 'local' and storage_path is not null)
      or
      (
        source_type = 'cloud'
        and storage_path is null
        and source_provider in ('world_final_assets', 'signal_task_assets')
        and source_asset_id is not null
        and source_url is not null
      )
    );

create index if not exists worldflow_assets_cloud_source_idx
  on public.worldflow_assets (source_provider, source_asset_id)
  where source_type = 'cloud';
