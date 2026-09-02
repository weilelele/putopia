# Worldflow

Production URL: https://www.multiverseco.org/worldflow

This module is part of the main Next.js application. Ship it through a PR into
`main` and the normal production deployment; do not replace the whole site with
an older Worldflow branch or add a rewrite to the legacy prototype.

## Code map

- `src/app/worldflow`: authenticated workspace, seven milestones, and the shared
  event/image/video production workbench.
- `src/lib/actions/worldflow.ts`: workflow types, creation, saving, submission,
  and architect review. Every signed-in creator (including architects) can create.
- `src/app/api/worldflow/cosmo-assets/route.ts`: search Cosmo channels by name or
  frequency, select a Band, and list image/video candidates.
- `src/app/api/worldflow/assets/link/route.ts`: associate one existing cloud asset
  with a world, shot, character, or parent/sub-event.
- `src/lib/cosmo.ts`: read-only Cosmo MongoDB adapter. `getBandAssetById` verifies
  an individual asset and its Band membership without loading the full asset pool.
- `src/lib/worldflow-material-target.ts`: skip pre-association saves when the
  selected shot, character, or event is already persisted.
- `src/lib/worldflow-production.ts`: assemble final-step linked videos into the
  sequence described by each shot's time slots and events.

## Storage and production data

Cloud association is zero-copy: only source ID/URL and workflow placement are
stored in `worldflow_assets`; `storage_path` is null. Reading a cloud asset
redirects to its source URL. Local uploads use the private `worldflow-assets`
Storage bucket. Cosmo is never written to by this module.

The four `supabase/migrations/*worldflow*.sql` migrations were already applied
to production before this module was restored to `main`. They are preserved
unchanged as history; this release requires no new schema or data migration.
Do not rerun all migrations against production just to deploy the page.

## Verification

Run `npm run design:check`, `npx tsc --noEmit`, `npm run lint`, `npm test`, and
`npm run build`. After production deployment, `/worldflow` must resolve (guests
are redirected to login); Worldflow API endpoints must reject unsigned requests
with 401 rather than returning 404. Verify the signed-in workspace read-only
before creating any test content, because previews share production data.
