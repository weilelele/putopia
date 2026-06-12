-- schema_v32: quiz_questions table
-- Stores assessment questions for a named quiz.
-- answer_key is kept server-side and never returned to the client.

create table if not exists quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     text not null default 'applicant-baseline-v1',
  sort_order  integer not null,
  prompt      text not null,
  -- options: [{ key: 'a', label: '...' }, { key: 'b', label: '...' }, ...]
  options     jsonb not null default '[]',
  -- answer_key: single key char matching one option (e.g. 'b')
  answer_key  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Seed with the current hardcoded questions
insert into quiz_questions (quiz_id, sort_order, prompt, options, answer_key) values
(
  'applicant-baseline-v1', 1,
  'What is the primary mission of the Multiverse Collective?',
  '[{"key":"a","label":"To prove the existence of time travel"},{"key":"b","label":"To identify, monitor, and establish contact with parallel worlds"},{"key":"c","label":"To develop consumer technology for interstellar exploration"},{"key":"d","label":"To document anomalous electromagnetic phenomena"}]',
  'b'
),
(
  'applicant-baseline-v1', 2,
  'When you submit a "sighting," what are you reporting?',
  '[{"key":"a","label":"A confirmed encounter with a non-human entity"},{"key":"b","label":"Any unexplained anomaly regardless of origin"},{"key":"c","label":"Evidence or a personal account of something you believe originated in a parallel world"},{"key":"d","label":"A technical malfunction in the Multiverse Console"}]',
  'c'
),
(
  'applicant-baseline-v1', 3,
  'Which best describes a World Builder''s primary function within the Collective?',
  '[{"key":"a","label":"Engineering physical devices for signal detection in the field"},{"key":"b","label":"Identifying and interpreting signals from parallel worlds"},{"key":"c","label":"Moderating community submissions and managing Applicant intake"},{"key":"d","label":"An Architect-level role responsible for world classification and naming"}]',
  'b'
),
(
  'applicant-baseline-v1', 4,
  'How does the Collective classify a parallel world as "stable"?',
  '[{"key":"a","label":"It has been documented by at least ten independent Voyagers"},{"key":"b","label":"It produces no hostile or disruptive signals"},{"key":"c","label":"Consistent signal contact has been established and its parameters are reliably mapped"},{"key":"d","label":"It shares an identical timeline with our own world"}]',
  'c'
),
(
  'applicant-baseline-v1', 5,
  'As an Applicant, your most important contribution right now is:',
  '[{"key":"a","label":"Purchasing a Voyager Pack immediately to gain full system access"},{"key":"b","label":"Waiting until you have conclusive evidence before reporting anything"},{"key":"c","label":"Actively observing, reporting sightings, and participating in votes and community discussions"},{"key":"d","label":"Focusing exclusively on technical analysis and leaving subjective reports to others"}]',
  'c'
);
