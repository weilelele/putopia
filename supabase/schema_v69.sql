-- Serialize new submissions with publication changes on the same device row.
-- Existing jobs and voting records remain intact when a device is unpublished.
create or replace function public.enforce_dreamcatcher_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  accepts_submissions boolean;
begin
  if tg_op = 'UPDATE' and new.dreamcatcher_id = old.dreamcatcher_id then
    return new;
  end if;

  select is_public and status <> 'offline' into accepts_submissions
  from public.dreamcatchers where id = new.dreamcatcher_id for update;

  if accepts_submissions is distinct from true then
    raise exception 'This Dreamcatcher is not accepting new dreams. Choose another device.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_dreamcatcher_publication() from public, anon, authenticated;
grant execute on function public.enforce_dreamcatcher_publication() to service_role;

drop trigger if exists dreamcatcher_publication_guard on public.dreamcatcher_jobs;
create trigger dreamcatcher_publication_guard
  before insert or update of dreamcatcher_id on public.dreamcatcher_jobs
  for each row execute function public.enforce_dreamcatcher_publication();
