-- schema_v54: cosmo_requests — the MCo → Cosmo command inbox.
--
-- Integration v2 flips the Cosmo↔MCo model: MCo owns the clock, Cosmo is a dumb
-- consumer. MCo appends a row here whenever it wants Cosmo to expand a world —
-- either the first (cold) batch once a world is bootstrapped, or the next batch
-- after a puzzle day's votes settle (carrying the raw vote result for Cosmo to
-- interpret).
--
-- Direction of the boundary (unchanged interface rule: neither DB writes the
-- other's): MCo WRITES rows here via its service-role admin client. Cosmo READS
-- them read-only via its own service-role key and tracks how far it has consumed
-- on ITS side (channel.mco.lastProcessedRequestId in Mongo) — it never writes
-- back here. Rows are append-only and immutable once written (no updated_at).
--
-- Conventions follow schema_v33: if-not-exists / DO-duplicate_object idempotent,
-- RLS enabled, explicit service_role grant. ONE deliberate deviation: `id` is a
-- bigint identity, not the usual uuid PK — so it doubles as Cosmo's monotonic
-- read cursor (poll `id > cursor ORDER BY id`).

CREATE TABLE IF NOT EXISTS public.cosmo_requests (
  id          bigint generated always as identity primary key,  -- monotonic; Cosmo's read cursor
  world_id    text not null references public.worlds(id) on delete cascade,  -- = Cosmo channel.mco.worldId
  type        text not null default 'expansion',   -- request kind; 'expansion' today, extensible
  payload     jsonb not null default '{}',         -- expansion: { puzzleType, tiles: [{ assetId, votes }] }; {} = cold/first request
  created_at  timestamptz not null default now()
);

-- Cosmo polls one world at a time: world_id = ? AND id > cursor ORDER BY id.
CREATE INDEX IF NOT EXISTS cosmo_requests_world_id_idx ON public.cosmo_requests (world_id, id);

ALTER TABLE public.cosmo_requests ENABLE ROW LEVEL SECURITY;

-- Internal integration plumbing — not member-facing. Cosmo reads and MCo writes
-- via service_role (which bypasses RLS); architects may read for debugging. No
-- anon/authenticated access is granted.
DO $$ BEGIN
  CREATE POLICY "cosmo_requests_all_architect" ON public.cosmo_requests FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.voyager_profiles
      WHERE id = auth.uid() AND role = 'architect'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Custom DDL tables need the grant explicitly (the service-role client otherwise
-- hits "permission denied"). The same service_role both writes (MCo) and reads (Cosmo).
GRANT ALL ON TABLE public.cosmo_requests TO service_role;
