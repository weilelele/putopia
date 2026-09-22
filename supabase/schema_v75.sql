-- NOTICE is a time-limited task. Existing notices remain historical records.
-- Apply before deploying the corresponding application changes.
begin;

alter table public.intel add column if not exists expires_at timestamptz;

-- NOT VALID preserves legacy NOTICE rows without inventing deadlines.
-- New and edited rows must satisfy the rule; editing a legacy notice requires
-- an explicit deadline (or reclassification by an Architect).
alter table public.intel add constraint intel_notice_expiry
  check (
    (tag = 'NOTICE' and expires_at is not null and isfinite(expires_at) and expires_at > timestamp)
    or (tag <> 'NOTICE' and expires_at is null)
  ) not valid;

create index if not exists intel_notice_expiry_idx
  on public.intel (expires_at) where tag = 'NOTICE';

comment on column public.intel.expires_at is
  'NOTICE task deadline. Active iff timestamp <= now() AND now() < expires_at. Legacy null deadlines are not active tasks.';

commit;
