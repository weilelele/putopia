-- schema_v36: make a Signal thread's evolution parameters tunable (were hardcoded).
--   glitch_start : day-0 glitch intensity (0–100)
--   glitch_step  : how much glitch changes per converge/diverge step
-- (clarity_max + drift_max already exist on signal_threads.)

ALTER TABLE public.signal_threads
  ADD COLUMN IF NOT EXISTS glitch_start integer not null default 70,
  ADD COLUMN IF NOT EXISTS glitch_step  integer not null default 15;
