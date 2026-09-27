-- Retire legacy Dispatch automation and prune unvoted backlog with a private backup.
-- Standalone: safe to apply BEFORE v77 and before the new application deploy.
begin;
create schema if not exists maintenance;
revoke all on schema maintenance from public,anon,authenticated;
create table maintenance.dispatch_retirement_backup (
  source_table text not null, record_id text not null, row_data jsonb not null,
  saved_at timestamptz not null default now(), primary key(source_table,record_id)
);
revoke all on maintenance.dispatch_retirement_backup from public,anon,authenticated;
alter table maintenance.dispatch_retirement_backup enable row level security;

-- Fail closed even for the old deployed application: its log reservation errors
-- make it skip sending. New Dreamcatcher notification uses a different outbox.
create function public.block_retired_dispatch_automation() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if tg_table_name='cosmo_requests' then
    if current_setting('app.dreamcatcher_request',true)='round' then return new; end if;
  elsif tg_table_name='signal_tasks' then
    if new.cosmo_session_id is null or to_jsonb(new)->>'dreamcatcher_round_id' is not null then return new; end if;
  end if;
  raise exception 'Legacy Dispatch automation retired';
end $$;
revoke all on function public.block_retired_dispatch_automation() from public,anon,authenticated;
grant execute on function public.block_retired_dispatch_automation() to service_role;
create trigger retired_dispatch_requests before insert on public.cosmo_requests for each row execute function public.block_retired_dispatch_automation();
create trigger retired_dispatch_import before insert on public.signal_tasks for each row execute function public.block_retired_dispatch_automation();
create trigger retired_dispatch_recall before insert on public.signal_recall_log for each row execute function public.block_retired_dispatch_automation();
create trigger retired_dispatch_engagement before insert on public.signal_engagement_log for each row execute function public.block_retired_dispatch_automation();

-- Stop concurrent votes/authoring while deciding and deleting. Valid votes are
-- re-evaluated inside this transaction, not from the earlier read-only preview.
lock table public.signal_tasks,public.signal_task_assets,public.signal_responses,public.signal_threads in share row exclusive mode;
create temporary table dispatch_prune_candidates on commit drop as
with ordered as (
  select t.id,exists(select 1 from public.signal_responses r where r.task_id=t.id) as voted,
    lag(exists(select 1 from public.signal_responses r where r.task_id=t.id)) over(
      partition by th.world_id order by coalesce(t.published_at,t.created_at),t.day_index,t.id
    ) as prior_voted
  from public.signal_tasks t join public.signal_threads th on th.id=t.thread_id
  where th.world_id is not null and to_jsonb(t)->>'dreamcatcher_round_id' is null
)
select id from ordered where not voted and not coalesce(prior_voted,false);

-- Backup all world-linked tasks, assets and votes, including retained rows whose
-- prev_task_id may be nulled by FK deletion. Back up automation context as well.
insert into maintenance.dispatch_retirement_backup
select 'signal_tasks',t.id::text,to_jsonb(t),now() from public.signal_tasks t join public.signal_threads th on th.id=t.thread_id where th.world_id is not null;
insert into maintenance.dispatch_retirement_backup
select 'signal_task_assets',a.id::text,to_jsonb(a),now() from public.signal_task_assets a where exists(select 1 from maintenance.dispatch_retirement_backup b where b.source_table='signal_tasks' and b.record_id=a.task_id::text);
insert into maintenance.dispatch_retirement_backup
select 'signal_responses',r.task_id::text||':'||r.user_id::text,to_jsonb(r),now() from public.signal_responses r where exists(select 1 from maintenance.dispatch_retirement_backup b where b.source_table='signal_tasks' and b.record_id=r.task_id::text);
insert into maintenance.dispatch_retirement_backup select 'signal_threads',id::text,to_jsonb(t),now() from public.signal_threads t;
insert into maintenance.dispatch_retirement_backup select 'cosmo_requests',id::text,to_jsonb(r),now() from public.cosmo_requests r;
insert into maintenance.dispatch_retirement_backup select 'signal_recall_log',task_id::text||':'||user_id::text,to_jsonb(r),now() from public.signal_recall_log r;
insert into maintenance.dispatch_retirement_backup select 'dreamcatcher_jobs',id::text,to_jsonb(j),now() from public.dreamcatcher_jobs j;

-- Retire the old device queue without changing world ownership or lifecycle.
update public.dreamcatcher_jobs set status='withdrawn',completed_at=now(),updated_at=now()
where coalesce(to_jsonb(dreamcatcher_jobs)->>'orchestration','legacy_daily')='legacy_daily' and status not in ('withdrawn','completed');
-- Rows are deleted; shared Cosmo/Storage media are deliberately retained because
-- live channels and retained history may reference the same physical objects.
delete from public.signal_tasks t using dispatch_prune_candidates p where t.id=p.id
  and not exists(select 1 from public.signal_responses r where r.task_id=t.id);
-- Assert every backed-up vote survives, including selected-asset FK cascades.
do $$ begin
  if exists(select 1 from maintenance.dispatch_retirement_backup b where b.source_table='signal_responses'
    and not exists(select 1 from public.signal_responses r where r.task_id::text=b.row_data->>'task_id' and r.user_id::text=b.row_data->>'user_id'
      and to_jsonb(r)=b.row_data)) then raise exception 'Vote preservation check failed'; end if;
end $$;
commit;
