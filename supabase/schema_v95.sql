-- v95: protect server-only quiz answers and outreach records.
-- Public quiz questions are projected by getQuizQuestions through service_role.
-- Outreach scripts use service_role; neither table is a public member API.
begin;
alter table public.quiz_questions enable row level security;
alter table public.outreach_log enable row level security;
alter table public.outreach_replies enable row level security;
revoke all privileges on table public.quiz_questions, public.outreach_log, public.outreach_replies from public, anon, authenticated;
grant select, insert, update, delete on table public.quiz_questions, public.outreach_log, public.outreach_replies to service_role;
commit;
