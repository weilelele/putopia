-- Persistent step-level feedback for Worldflow. Feedback is soft-resolved so
-- architect actions remove prompts from the workspace without erasing history.

create table public.worldflow_feedback (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worldflow_worlds(id) on delete cascade,
  step integer not null check (step between 1 and 7),
  author_id uuid not null references public.voyager_profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.voyager_profiles(id) on delete set null,
  constraint worldflow_feedback_resolution_check check (
    (resolved_at is null and resolved_by is null)
    or (resolved_at is not null and resolved_by is not null)
  )
);

create index worldflow_feedback_world_step_active_idx
  on public.worldflow_feedback (world_id, step, created_at desc)
  where resolved_at is null;

alter table public.worldflow_feedback enable row level security;

-- Worldflow data is accessed only through authenticated server routes. Those
-- routes validate world access and reserve resolution for architect accounts.
revoke all on table public.worldflow_feedback from anon, authenticated;
grant all on table public.worldflow_feedback to service_role;
