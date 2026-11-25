-- Read-only, after schema_v130. Resolve the LA natural-day boundaries with IANA time zones first.
-- Supply the verified cohort311548 + linked/window QA account exclusion array; never substitute Auth creation.
-- All rows share a link-created order cohort and a single observation cutoff.
select * from public.report_shopify_checkout_coverage(
  :window_start_utc::timestamptz,
  :window_end_utc::timestamptz,
  :observed_through_utc::timestamptz,
  :excluded_user_ids::uuid[]
);

-- Health counts measure reports/requests, NOT distinct affected users or abandoned orders.
-- Browser reports are unverified and server rejections may describe the same attempt: do not add them as people.
select source,reason,observed_event,sum(occurrences) as observation_failure_reports
from public.shopify_observation_health
where hour_utc>=:window_start_utc::timestamptz and hour_utc<:window_end_utc::timestamptz
group by source,reason,observed_event order by source,reason,observed_event;

-- Metadata backlog is operational coverage, not payment failure. Do not disclose order IDs.
select count(*) as payment_method_jobs,
  count(*) filter(where next_attempt_at<=now()) as due_jobs,
  min(queued_at) as oldest_queued_at
from public.initiation_shopify_payment_metadata_queue;
