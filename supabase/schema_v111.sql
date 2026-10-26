-- Payment-activation alerting ledger. NOT APPLIED to production.
-- /api/cron/initiation-expiry records each run; /api/cron/payment-alerts reads the
-- streak and remembers which (alert_key, state) pair it already mailed.
-- Independent of v109/v110; apply in any order after them.
begin;

create table public.ops_alerts (
 alert_key text primary key,
 state text not null,
 alerted_at timestamptz not null default now()
);

create table public.ops_cron_health (
 job text primary key,
 last_run_at timestamptz not null,
 last_ok_at timestamptz,
 failing_since timestamptz,
 consecutive_failures integer not null default 0 check(consecutive_failures >= 0),
 last_error text
);

alter table public.ops_alerts enable row level security;
alter table public.ops_cron_health enable row level security;
revoke all on public.ops_alerts, public.ops_cron_health from public, anon, authenticated;
grant select, insert, update on public.ops_alerts, public.ops_cron_health to service_role;

-- Atomic streak bookkeeping: a null p_error is a successful run.
create function public.record_ops_cron_run(p_job text, p_error text default null) returns void
language sql security invoker set search_path=public,pg_temp as $$
 insert into ops_cron_health(job,last_run_at,last_ok_at,failing_since,consecutive_failures,last_error)
 values(p_job,now(),case when p_error is null then now() end,case when p_error is null then null else now() end,
  case when p_error is null then 0 else 1 end,left(p_error,2000))
 on conflict(job) do update set last_run_at=now(),
  last_ok_at=case when p_error is null then now() else ops_cron_health.last_ok_at end,
  failing_since=case when p_error is null then null else coalesce(ops_cron_health.failing_since,now()) end,
  consecutive_failures=case when p_error is null then 0 else ops_cron_health.consecutive_failures+1 end,
  last_error=left(p_error,2000);
$$;
revoke all on function public.record_ops_cron_run(text,text) from public, anon, authenticated;
grant execute on function public.record_ops_cron_run(text,text) to service_role;

commit;
