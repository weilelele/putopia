begin;

create table public.mission_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null check (mission_id ~ '^(REC|CNT|OBS)-[0-9]{3,}$'),
  accepted_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.mission_acceptances enable row level security;
revoke all on table public.mission_acceptances from public, anon, authenticated;
grant select, insert on table public.mission_acceptances to service_role;

commit;
