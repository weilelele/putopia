# Device legacy retirement

Date: 2026-09-02. This is a code handoff, not a production deployment record.

## Canonical interfaces

- `/admin/device-batches`: Device Library configuration and manual publication.
- `/admin/device-batches/new`: create a persistent Batch draft.
- `/admin/device-batches/blueprints`: Story Lab review workflow.
- `/devices`: production Device Library.
- `/devices/batches/[slug]`: published Batch detail.
- Claims, My Consoles, orders, fulfillment and Batch discussions remain intact.

The old `/admin/devices`, `/devices/[id]` and `/devices/live` implementations
are removed. Their files contain only permanent redirects for historical links.
Legacy device IDs cannot be reliably mapped to Batch slugs, so those links land
on the Library rather than an invented matching Batch.

## Removed and replaced

- Legacy device CRUD/assignment actions and the unused mock device-match action.
- Unused archive/detail clients and their exclusive hero, media, participation
  and discussion-preview components.
- Runtime static registry fallbacks in public and admin reads. Database failures
  now surface an unavailable state; an empty registry does not fabricate Batches.
- Browser-local Batch creation/storage. Only the pure seed builder remains, now
  in `src/lib/device-batch-seed.ts`; creation persists through the admin action.
- The static checkout lookup. Checkout requires an explicitly supplied Batch;
  visiting the claim page without a Batch no longer silently selects Cairo.

Static examples have moved to `src/lib/__fixtures__/device-batches.ts` and are
imported only by unit tests. Feeds, newsletter gathering, Studio references,
offline snapshots and the Wiki exporter now read published Batch snapshots.
They no longer query the old `devices` table. Existing offline clients retain a
compatible shape: `status: unknown` with the actual lifecycle in `batch_status`.
No individual owner is inferred from a Batch lead or fixture holder.

The source mapper is extracted into `device-batch-records.ts` and tested for
published-snapshot isolation, empty registries, archived/draft exclusion and
live inventory. Public data must never fall back to private draft content.

## Data and concurrent work

No production database rows, orders, units, ownership records or historical
comments were deleted. Removed tracked implementations are recoverable from Git.
No migrations, payment requests, emails, content publication or Wiki sync ran.

The existing manual-publication and live-placeholder changes in this shared
working directory have been preserved. Do not reset these changes. This task
did not commit, push, merge or deploy the shared worktree. The release task must
include the new untracked mapper, fixture, seed, tests and error-boundary files
when freezing the release snapshot.

## Verification

- Vitest: 27 files, 142 tests passed.
- `npm run design:check`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 0 errors and 25 existing warnings.
- `npm run build`: passed (Next.js 16.2.6, webpack).
- Browser at 390×844: `/devices/live` navigates to the canonical `/devices`
  login return path; no browser errors in that check. Authenticated editing and
  publication were not exercised, and no login bypass was introduced.
- `git diff --check`: passed. Source search found no remaining old table reads.

Removing the fallback exposed build-time database access on the create-Batch
page. Both Batch admin entry pages now explicitly use request-time rendering.
Local `.env.production.local` has empty Supabase values that override configured
`.env.local` values; neither environment file was changed. Browser checks used
the development configuration rather than altering the user's settings.

## Production release boundary

Read-only Vercel inspection confirms the team is now Pro. The old Hobby cron
restriction is historical, not a current blocker. The production deployment
still points at `7970f2b`, preceding the Device integration on main (`992955c`).

Initial schema inspection found the three Story Lab tables absent. During the
handoff, the release task reported applying and verifying v63 as migration
`20260902214826_device_story_lab_review_and_publication`. Do not repeat it.
The release task owns the final combined change freeze, Preview validation,
PR, squash merge and production verification. This cleanup task is finished
and will make no further shared-worktree changes after handoff. Do not replay
Device prerequisites or promote the old no-cron Preview. See
`device-pro-release-preflight.md` for the coordinated release checklist.
