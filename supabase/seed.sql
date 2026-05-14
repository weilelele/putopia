-- Putopia Collective — Seed Data
-- Run AFTER schema.sql
-- NOTE: This creates demo votes only. Voyager profiles are created on sign-up.
-- To seed test users, create them via the Supabase Auth dashboard, then update
-- their roles manually: UPDATE voyager_profiles SET role = 'voyager' WHERE id = '<uuid>';

-- ─────────────────────────────────────────
-- Demo votes
-- ─────────────────────────────────────────

-- Public vote (anyone can participate)
insert into public.votes (title, description, type, scope, options, is_active)
values (
  'Which dimension should we explore next?',
  'Open to all travelers across the multiverse. Your input guides our next expedition.',
  'single',
  'public',
  '[
    {"id": "opt-1", "label": "The Amber Corridor (dense jungle, humid)"},
    {"id": "opt-2", "label": "Mirror Meridian (reflective desert, unstable)"},
    {"id": "opt-3", "label": "Frostveil Station (arctic, high-tech ruins)"},
    {"id": "opt-4", "label": "The Verdant Anomaly (overgrown city, bioluminescent)"}
  ]'::jsonb,
  true
);

-- Applicant-only vote
insert into public.votes (title, description, type, scope, options, is_active)
values (
  'Applicant Orientation: Preferred Schedule',
  'Help us schedule the next onboarding session.',
  'single',
  'applicant',
  '[
    {"id": "sched-1", "label": "Weekday mornings (Mon–Fri, 09:00–11:00)"},
    {"id": "sched-2", "label": "Weekday evenings (Mon–Fri, 19:00–21:00)"},
    {"id": "sched-3", "label": "Weekend (Sat or Sun, flexible time)"}
  ]'::jsonb,
  true
);

-- Voyager vote (multi-select)
insert into public.votes (title, description, type, scope, options, is_active)
values (
  'Equipment Priority for Q3 Expeditions',
  'Voyagers only. Select up to three items you consider essential for the next quarter.',
  'multi',
  'voyager',
  '[
    {"id": "eq-1", "label": "Dimensional resonance scanner"},
    {"id": "eq-2", "label": "Portable atmospheric converter"},
    {"id": "eq-3", "label": "Neural translation module"},
    {"id": "eq-4", "label": "Temporal anchor beacon"},
    {"id": "eq-5", "label": "Biometric hazard suit (Mk III)"}
  ]'::jsonb,
  true
);

-- Architect vote (ended, for history display)
insert into public.votes (title, description, type, scope, options, is_active, ends_at)
values (
  'Protocol Revision: Architect Council Q1',
  'Archived. Voting period has closed.',
  'single',
  'architect',
  '[
    {"id": "proto-1", "label": "Maintain current 72-hour embargo window"},
    {"id": "proto-2", "label": "Reduce to 48-hour window for Class-A dimensions"},
    {"id": "proto-3", "label": "Implement tiered system based on dimension risk level"}
  ]'::jsonb,
  false,
  now() - interval '30 days'
);
