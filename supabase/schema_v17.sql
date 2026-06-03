-- schema_v17: activity_events feed table
-- Every write action auto-appends a row here; admin can hide rows via is_visible.

create table if not exists activity_events (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- actor (denormalized so history survives profile changes)
  actor_id      uuid        references voyager_profiles(id) on delete set null,
  actor_name    text        not null,
  actor_role    text        not null,   -- 'voyager' | 'architect'
  actor_socials jsonb       default '[]'::jsonb,  -- [{"platform":"X","url":"..."}]

  -- event
  event_type    text        not null,
  -- values:
  --   intel_published | intel_updated
  --   device_updated
  --   world_added
  --   vote_opened
  --   vote_cast
  --   member_joined

  -- target object (snapshot at time of event)
  target_id     text,
  target_title  text,
  target_image  text,
  target_href   text,

  -- vote_cast only
  vote_option   text,

  -- grouping (all vote_cast rows for the same vote share group_key = 'vote-<vote_id>')
  group_key     text,

  -- admin visibility toggle (soft hide, not delete)
  is_visible    boolean     not null default true
);

-- most-recent-first is the default read order
create index if not exists activity_events_created_at_idx
  on activity_events (created_at desc);

-- RLS: voyagers can read visible events; only service_role can write
alter table activity_events enable row level security;

create policy "visible events readable by authenticated users"
  on activity_events for select
  to authenticated
  using (is_visible = true);

create policy "service role full access"
  on activity_events for all
  to service_role
  using (true)
  with check (true);
