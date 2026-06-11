-- schema_v31: applicant task completion timestamps
-- Two tasks (quiz + intel read) require explicit DB records.
-- Sighting completion = worlds.submitted_by EXISTS (queried live).
-- Votes completion    = vote_responses.user_id COUNT DISTINCT >= 2 (queried live).

alter table voyager_profiles
  add column if not exists task_quiz_at  timestamptz,
  add column if not exists task_intel_at timestamptz;
