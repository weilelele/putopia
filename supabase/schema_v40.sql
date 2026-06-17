-- schema_v40: keep voyager_profiles.email in sync for access-link recovery
--
-- schema_v25 added the email column and backfilled existing rows, but the
-- auth.users insert trigger continued creating new profiles without email.
-- The expired-link resend flow depends on this field, so write it on all new
-- users and backfill any rows created after schema_v25.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.voyager_profiles (id, display_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'applicant',
    lower(new.email)
  );
  return new;
end;
$$;

update public.voyager_profiles vp
set email = lower(au.email)
from auth.users au
where au.id = vp.id
  and au.email is not null
  and (vp.email is null or vp.email <> lower(au.email));
