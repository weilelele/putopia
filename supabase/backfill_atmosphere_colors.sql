-- backfill_atmosphere_colors.sql
-- Remap existing worlds' old near-black gradient presets onto the new, hue-rich
-- "atmosphere tone" palette (see worlds/submit/page.tsx GRADIENT_PRESETS).
-- The old presets were almost the same color as the page background, so on the
-- new full-card VisionCard they read as muddy/invisible. Old values map 1:1.
--
-- Safe to re-run: only rewrites rows still holding a known old preset value.

-- VOID
update public.worlds set gradient_from = '#0E1138', gradient_to = '#2E2E8A'
  where gradient_from = '#0a0e27' and gradient_to = '#1a1040';

-- EMBER
update public.worlds set gradient_from = '#2A0810', gradient_to = '#7A1226'
  where gradient_from = '#2d1200' and gradient_to = '#5c2800';

-- TIDE
update public.worlds set gradient_from = '#080F1E', gradient_to = '#1A4A7A'
  where gradient_from = '#0a1628' and gradient_to = '#0d3050';

-- GROVE
update public.worlds set gradient_from = '#0A2412', gradient_to = '#1E6B34'
  where gradient_from = '#0d1f0d' and gradient_to = '#1a3520';

-- DUSK
update public.worlds set gradient_from = '#1A0A28', gradient_to = '#4E1E7A'
  where gradient_from = '#1a0a2e' and gradient_to = '#3d1060';

-- ASH
update public.worlds set gradient_from = '#161616', gradient_to = '#4A4A4A'
  where gradient_from = '#1c1c1c' and gradient_to = '#3a3a3a';
