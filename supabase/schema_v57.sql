-- schema_v57: btree indexes for the hot read-path filters.
--
-- 2026-07 perf review: these columns are filtered/sorted on every Signal Feed
-- cache rebuild (30s), console/hero-stats load, and dashboard feed, but only
-- had sequential scans behind them. Each index below maps to a concrete query:
--
--   worlds(lifecycle_state, created_at)   — signal-feed.ts feed pools (syncing/
--                                           stable ordered by created_at),
--                                           getAllWorlds / getPipelineWorlds
--   worlds(submitted_by)                  — api/checkout per-user world count
--   voyager_profiles(role)                — hero-stats voyager count,
--                                           dashboard-feed role filters
--   intel(timestamp)                      — feed + getAllIntel ordering
--   devices(updated_at)                   — feed device pool ordering
--   votes partial (is_active)             — active-vote feed pool; partial
--                                           because closed votes accumulate
--                                           forever and are never listed
--   activity_events(event_type, is_visible, created_at)
--                                         — voyager-activation feed pool
--                                           (equality, equality, sort)

CREATE INDEX IF NOT EXISTS worlds_lifecycle_created_idx
  ON public.worlds (lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS worlds_submitted_by_idx
  ON public.worlds (submitted_by);

CREATE INDEX IF NOT EXISTS voyager_profiles_role_idx
  ON public.voyager_profiles (role);

CREATE INDEX IF NOT EXISTS intel_timestamp_idx
  ON public.intel ("timestamp" DESC);

CREATE INDEX IF NOT EXISTS devices_updated_at_idx
  ON public.devices (updated_at DESC);

CREATE INDEX IF NOT EXISTS votes_active_created_idx
  ON public.votes (created_at DESC)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS activity_events_type_visible_created_idx
  ON public.activity_events (event_type, is_visible, created_at DESC);
