-- Allow Worldflow to reference Forge/Cosmo assets without copying the source
-- file. The API validates each asset against its Cosmo channel and band before
-- inserting the association row.
alter table public.worldflow_assets
  drop constraint if exists worldflow_assets_source_shape_check;

alter table public.worldflow_assets
  add constraint worldflow_assets_source_shape_check
    check (
      (source_type = 'local' and storage_path is not null)
      or
      (
        source_type = 'cloud'
        and storage_path is null
        and source_provider in ('world_final_assets', 'signal_task_assets', 'cosmo')
        and source_asset_id is not null
        and source_url is not null
      )
    );
