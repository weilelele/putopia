-- Import only the ten verified legacy fictional profiles from setup-members.mjs
-- and add-members-2.mjs. Preserve ids, bios, avatars, story roles and comments.
-- Only classify identities; preserve existing email and login settings.
-- No device allocations or inventory changes. Abort if accounts acquired orders/sessions.
begin;
create temporary table npc_import_targets(id uuid primary key, email text not null) on commit drop;
insert into npc_import_targets values
  ('a4c6b43a-6c0f-409a-a962-0b2b9cd861ad'::uuid, 'luke.brandner@putopia.internal'),
  ('f7c9af6e-b5d4-4937-9a51-848b3f6fbd69'::uuid, 'page.chen@putopia.internal'),
  ('4fad4940-a58f-449b-96cc-83ff21544379'::uuid, 'amara.okafor@putopia.internal'),
  ('0eba54e4-1b88-4e95-bcc1-7e8f083bd265'::uuid, 'ines.cavalcanti@putopia.internal'),
  ('c104f5f5-94ad-49d0-8d14-cee6a9d62cb1'::uuid, 'saoirse.flanagan@putopia.internal'),
  ('6402815a-72e8-4bad-836b-c8c7add76120'::uuid, 'maren.solberg@putopia.internal'),
  ('86fadca3-8739-4553-9179-c4d0e84895ee'::uuid, 'ryo.tanaka@putopia.internal'),
  ('403b32a7-8d85-4cdd-9c7f-4f2c7919d726'::uuid, 'valentina.cruz@putopia.internal'),
  ('d1e7f1ce-19c1-4422-b8e8-a1dcd64234c2'::uuid, 'tariq.osei@putopia.internal'),
  ('480c23f3-5823-4375-bebd-db8b2d2c5319'::uuid, 'shen.zhimeng@putopia.internal');

create table public.npc_legacy_imports (
  user_id uuid primary key references public.voyager_profiles(id) on delete restrict,
  profile_before jsonb not null,
  imported_at timestamptz not null default now(),
  source text not null default 'verified legacy setup-members/add-members-2 identities'
);
alter table public.npc_legacy_imports enable row level security;
revoke all on public.npc_legacy_imports from public, anon, authenticated;
grant select on public.npc_legacy_imports to service_role;

-- Exclusive lock covers only this short transaction; the immutable-type guard
-- is restored before other sessions can access the table again.
lock table public.voyager_profiles in access exclusive mode;
lock table auth.users in share row exclusive mode;
do $$
begin
  if (select count(*) from npc_import_targets t join auth.users u on u.id=t.id and u.email=t.email
      join public.voyager_profiles p on p.id=t.id where p.account_kind='human') <> 10 then
    raise exception 'Legacy NPC identities do not match the reviewed manifest';
  end if;
  if exists(select 1 from auth.sessions s join npc_import_targets t on t.id=s.user_id)
    or exists(select 1 from public.voyager_orders o join npc_import_targets t on t.id=o.user_id)
    or exists(select 1 from public.device_batch_units u join npc_import_targets t on t.id=u.user_id) then
    raise exception 'Legacy NPC has sessions, orders or Units; review before importing';
  end if;
end;
$$;
insert into public.npc_legacy_imports(user_id,profile_before)
select p.id,to_jsonb(p)
from npc_import_targets t join public.voyager_profiles p on p.id=t.id join auth.users u on u.id=t.id;

alter table public.voyager_profiles disable trigger voyager_profiles_protect_npc;
update public.voyager_profiles p set account_kind='npc'
from npc_import_targets t where p.id=t.id;
alter table public.voyager_profiles enable trigger voyager_profiles_protect_npc;
-- Existing email, experiment, Auth metadata and login settings are unchanged.
commit;
