-- v110: Initiation completion functions are security invoker and run as service_role.
-- They assign member_no with nextval(), but the sequence only granted its owner,
-- so every buyer without a member number failed at activation after capture.
begin;
grant usage, select on sequence public.voyager_member_no_seq to service_role;
commit;
