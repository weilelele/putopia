-- First-observer designation for fuzzy (official) worlds.
--
-- An official world stays a fuzzy signal until an architect designates one
-- observation report as its first observer. That report's author becomes the
-- world's "by" and its first photo becomes the world's picture. Clearing the
-- column returns the world to fuzzy. Writes go through a server action that
-- requires a human architect (service role); users cannot set it.
begin;

alter table public.worlds
  add column if not exists first_observer_report_id uuid
  references public.world_reports(id) on delete set null;

comment on column public.worlds.first_observer_report_id is
  'Observation report designated by an architect as the world''s first observer; null = fuzzy signal.';

commit;
