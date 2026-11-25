begin;
revoke usage, select on sequence public.voyager_member_no_seq from service_role;
commit;
