-- schema_v22.sql -- provision_voyager(): never demote an architect.
-- Architects who pay keep their role but still get member_no/batch/member_since.
create or replace function public.provision_voyager(p_uid uuid)
returns table(member_no integer, batch_label text, already boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_source  text;
  v_role    user_role;
  v_no      integer;
begin
  select label into v_current from public.batches where is_current limit 1;
  if v_current is null then v_current := 'Original Batch'; end if;

  select vp.member_source, vp.member_no, vp.role
    into v_source, v_no, v_role
    from public.voyager_profiles vp
   where vp.id = p_uid;

  if v_source = 'paid' then
    return query select v_no, v_current, true;
    return;
  end if;

  if v_no is null then
    v_no := nextval('public.voyager_member_no_seq');
  end if;

  update public.voyager_profiles
     set role          = case when role = 'architect' then role else 'voyager'::user_role end,
         member_source = 'paid',
         member_no     = v_no,
         member_since  = now(),
         batch_label   = v_current
   where id = p_uid;

  return query select v_no, v_current, false;
end;
$$;
