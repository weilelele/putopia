-- OPERATOR-ONLY recovery, never run automatically. Keeps automation disabled.
-- Restores only missing task/asset rows from v78's private backup; never replaces
-- existing votes/content or restarts old jobs. Run as the database owner.
begin;
lock table public.signal_tasks,public.signal_task_assets,public.signal_responses in share row exclusive mode;
alter table public.signal_tasks disable trigger retired_dispatch_import;
-- Null historical back-links on insert to avoid references to a later restore.
insert into public.signal_tasks
select (jsonb_populate_record(null::public.signal_tasks,b.row_data || '{"prev_task_id":null}'::jsonb)).*
from maintenance.dispatch_retirement_backup b
where source_table='signal_tasks' and not exists(select 1 from public.signal_tasks t where t.id::text=b.record_id);
insert into public.signal_task_assets
select (jsonb_populate_record(null::public.signal_task_assets,b.row_data)).*
from maintenance.dispatch_retirement_backup b
where source_table='signal_task_assets' and not exists(select 1 from public.signal_task_assets a where a.id::text=b.record_id);
update public.signal_tasks t set prev_task_id=(b.row_data->>'prev_task_id')::uuid
from maintenance.dispatch_retirement_backup b
where b.source_table='signal_tasks' and t.id::text=b.record_id and t.prev_task_id is null
and b.row_data->>'prev_task_id' is not null
and exists(select 1 from public.signal_tasks prior where prior.id::text=b.row_data->>'prev_task_id');
alter table public.signal_tasks enable trigger retired_dispatch_import;
commit;
