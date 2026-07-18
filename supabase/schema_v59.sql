-- schema_v59.sql
-- Onboarding 3-question flow go-live.
--
-- The flow changed from 2 questions to 3:
--   Q1 (new)  Multiverse Console curiosity  → applications.console_interest
--   Q2        World choice (reworded copy)   → applications.location  (unchanged column)
--   Q3        Join-urgency slider (replaces  → applications.join_urgency (int 0–5)
--             the old "belief" slider)
--
-- Answer storage:
--   • console_interest — new text column (option id: mechanism|worlds|personal|access)
--   • join_urgency     — new int column (0–5 slider value)
--   • location         — unchanged (still the world-choice text)
--   • reason           — retained; now stores the human-readable urgency reading.
--                        Historical rows keep their old belief readings; the two are
--                        distinguishable by content and the clean int lives in
--                        join_urgency, so analytics never has to parse `reason`.
--
-- Idempotent.

alter table public.applications
  add column if not exists console_interest text,
  add column if not exists join_urgency integer;

-- New variant copy slot for the Console question (Q1). The existing q1_headline
-- column now drives the Q3 urgency slider; q2_headline still drives the
-- world-choice question (Q2). (Column names are legacy; see the editor labels.)
alter table public.onboarding_variants
  add column if not exists console_headline text;

-- Update the DEFAULT row to the new 3-question wording.
-- Variant rows (a3, s1) leave these null and continue to inherit the default.
update public.onboarding_variants set
  console_headline = 'What do you most want to know about the Multiverse Console?',
  q2_headline      = 'Which world should the Console show you first?',
  q1_headline      = 'How urgently do you want to join the Collective and explore parallel worlds yourself?'
where match_key = '';

