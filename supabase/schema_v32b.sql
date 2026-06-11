-- schema_v32b: grant permissions on quiz_questions
-- New tables in Supabase require explicit grants for the roles to access them.

grant select, insert, update, delete on public.quiz_questions to service_role;
grant select on public.quiz_questions to authenticated;
grant select on public.quiz_questions to anon;
