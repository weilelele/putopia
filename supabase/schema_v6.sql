-- schema_v6: dashboard_feed table for daily AI-generated status digest

create table if not exists dashboard_feed (
  id          uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  lines       jsonb not null default '[]'::jsonb
  -- lines is an array of objects:
  -- {
  --   ts:        "MM.DD"         -- formatted date label
  --   text:      string          -- plain summary text
  --   entities:  [               -- optional inline avatars
  --     { type: 'device'|'voyager', name: string, image_url: string|null, id: string }
  --   ]
  -- }
);

-- Only keep the latest N rows; old ones can be pruned
-- RLS: public read, service-role write only
alter table dashboard_feed enable row level security;

create policy "public can read feed"
  on dashboard_feed for select
  to anon, authenticated
  using (true);
