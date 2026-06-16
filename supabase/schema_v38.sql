-- ─────────────────────────────────────────
-- schema_v38: World Building — weld Signal Dispatch onto the World lifecycle
--
-- Reframes the system around the World as the central object with a 3-stage
-- public lifecycle (the 4 internal enum values are kept and mapped in code):
--   proposed            → Stage 1  Raw Imagination (initial vision)
--   picked | syncing    → Stage 2  Signal Tuning   (being refined via Dispatch)
--   stable              → Stage 3  Established World (archived)
--
-- A signal_thread (Investigation) is now strictly "a World in its Signal Tuning
-- phase". Every thread belongs to exactly one world; its title/cover come from
-- the world. This migration only adds the two new columns the welding needs;
-- the world_id FK already exists (schema_v34).
--
-- Pure-manual model: admins create each day's puzzle by hand. There is NO
-- automatic question generation. (Auto-advance / clarity / drift from v34 is
-- retired — those columns are left in place but unused.)
-- ─────────────────────────────────────────

-- 2.1 Owner voting permission — who may respond to this world's dispatch.
--   self   → only the owner confirms each step (private exploration)
--   voters → only Voyager+ identities may vote
--   all    → any registered applicant may vote
ALTER TABLE public.worlds
  ADD COLUMN IF NOT EXISTS vote_scope text NOT NULL DEFAULT 'all'
    CHECK (vote_scope IN ('self', 'voters', 'all'));

-- 2.2 Media progression node — the current medium being tuned for this world.
--   image → video → audio  (advanced manually by the admin)
ALTER TABLE public.signal_threads
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'image'
    CHECK (phase IN ('image', 'video', 'audio'));

-- Index for the common "find the active thread for a world" lookup.
CREATE INDEX IF NOT EXISTS signal_threads_world_id_idx
  ON public.signal_threads (world_id);
