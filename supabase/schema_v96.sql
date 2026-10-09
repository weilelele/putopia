-- Account deletion visibility is independent of membership/capacity and fulfillment.
begin;
create table public.account_deletions (
  user_id uuid primary key references public.voyager_profiles(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from public, anon, authenticated;
grant select, insert, update, delete on public.account_deletions to service_role;
-- Preserve visibility behavior for shells already anonymized by the old flow.
insert into public.account_deletions(user_id)
select p.id from public.voyager_profiles p join auth.users u on u.id=p.id
where u.email = 'deleted-' || p.id::text || '@deleted.invalid'
on conflict (user_id) do nothing;
commit;
