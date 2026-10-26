-- Reverts schema_v111.sql. The alert crons tolerate the missing objects (they log and return 503).
begin;
drop function if exists public.record_ops_cron_run(text,text);
drop table if exists public.ops_cron_health;
drop table if exists public.ops_alerts;
commit;
