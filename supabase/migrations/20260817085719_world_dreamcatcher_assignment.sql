-- Keep a world's device ownership separate from its current queue job. This
-- allows the legacy archive to belong to a Dreamcatcher without consuming the
-- live queue's 50 available positions or changing any existing lifecycle state.
alter table public.worlds
  add column if not exists dreamcatcher_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'worlds_dreamcatcher_id_fkey'
      and conrelid = 'public.worlds'::regclass
  ) then
    alter table public.worlds
      add constraint worlds_dreamcatcher_id_fkey
      foreign key (dreamcatcher_id)
      references public.dreamcatchers(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists worlds_dreamcatcher_id_idx
  on public.worlds (dreamcatcher_id, submitted_at desc);

-- Temporary compatibility rule: every existing, real user submission belongs
-- to the first/default Dreamcatcher. Resolve by slug so the migration never
-- depends on a generated UUID and never overwrites an explicit assignment.
update public.worlds
set dreamcatcher_id = (
  select id
  from public.dreamcatchers
  where slug = 'kyoto-02'
)
where submitted_by is not null
  and coalesce(is_test, false) = false
  and dreamcatcher_id is null;

comment on column public.worlds.dreamcatcher_id is
  'Dreamcatcher that owns this world; independent from active queue jobs.';
