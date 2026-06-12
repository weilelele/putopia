-- ─────────────────────────────────────────
-- schema_v27: outreach_log
-- Durable record of every high-activity / co-creation email we send, so future
-- campaigns can DEDUPE — never email the same person twice unless intended.
-- ─────────────────────────────────────────

create table if not exists public.outreach_log (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  campaign       text not null,            -- e.g. 'high_activity_2026_06'
  email_variant  text,                     -- 'inner_circle' | 'explorers'
  behavior_group text,                     -- snapshot of the segment at send time
  rank           integer,                  -- rank within that campaign
  score          numeric,                  -- weighted activity score at send time
  resend_id      text,                     -- Resend message id (delivery audit)
  sent_at        timestamptz not null default now()
);

-- one row per (person, campaign): re-running a campaign won't double-insert
create unique index if not exists outreach_log_email_campaign_uniq
  on public.outreach_log (lower(email), campaign);

-- fast "have we ever contacted this email?" lookups for dedupe across campaigns
create index if not exists outreach_log_email_idx
  on public.outreach_log (lower(email));

-- DDL-created tables don't inherit Supabase default grants — must be explicit
grant all on table public.outreach_log to service_role;
grant select on table public.outreach_log to anon, authenticated;
