-- Private authoring notes; never part of public member profiles.
create table public.npc_voice_profiles (
 user_id uuid primary key references public.voyager_profiles(id) on delete cascade,
 instructions text not null check (char_length(instructions) <= 12000),
 updated_by uuid not null references public.voyager_profiles(id),
 updated_at timestamptz not null default now()
);
alter table public.npc_voice_profiles enable row level security;
revoke all on public.npc_voice_profiles from public, anon, authenticated;
grant select, insert, update on public.npc_voice_profiles to service_role;
