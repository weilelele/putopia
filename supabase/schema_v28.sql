-- ─────────────────────────────────────────
-- schema_v28: reply tracking for outreach campaigns
-- Replies to campaign emails are captured via Resend Inbound (webhook) so
-- "how many replied" becomes a query, not a manual inbox count.
-- See docs/reply-tracking-setup.md for the DNS/Resend wiring.
-- ─────────────────────────────────────────

alter table public.outreach_log
  add column if not exists reply_token text,          -- per-recipient token in Reply-To (+addressing)
  add column if not exists replied_at   timestamptz,  -- first reply timestamp (null = no reply yet)
  add column if not exists reply_count  integer not null default 0;

create index if not exists outreach_log_reply_token_idx on public.outreach_log (reply_token);

-- one row per inbound reply (full audit; outreach_log holds the rolled-up state)
create table if not exists public.outreach_replies (
  id           uuid primary key default gen_random_uuid(),
  outreach_id  uuid references public.outreach_log(id) on delete set null,
  email        text not null,            -- the replier (matched to outreach_log)
  campaign     text,
  subject      text,
  message_id   text,                     -- inbound Message-Id, for idempotency
  resend_email_id text,                  -- Resend inbound email_id (to fetch full body if needed)
  received_at  timestamptz not null default now()
);

-- idempotency: the same inbound message must not double-count on webhook retries
create unique index if not exists outreach_replies_message_id_uniq
  on public.outreach_replies (message_id) where message_id is not null;

-- DDL-created tables don't inherit Supabase default grants — must be explicit
grant all on table public.outreach_replies to service_role;
grant select on table public.outreach_replies to anon, authenticated;
