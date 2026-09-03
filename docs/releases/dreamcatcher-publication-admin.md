# Dreamcatcher publication controls

## Scope

- Added New Dreamcatcher and Edit entry points. Identity, city/country, displayed location, time zone, 8–10 minute rounds, and 1–500 waiting capacity are editable. New devices are always created unpublished and idle, with publication a separate action.
- Device slug is permanent; editing uses an exact whitelist and never changes job ownership, publication, or worker-owned runtime state. Unique slug/code conflicts return a friendly error. Compare-and-update uses original configuration fields rather than the worker-updated timestamp.
- Forms preserve values on failure, disable while saving, and confirm before discarding edits. Reducing capacity retains all queued jobs; new submissions resume once below the new limit. Duration changes affect subsequent rounds only.
- `/admin/dreamcatchers`: architect-only list of existing Dreamcatchers, with All / Published / Unpublished views, explicit confirmation, and publish/unpublish actions.
- Publication (`is_public`) is independent of worker-owned runtime state. Publishing does not turn a paused/offline device into a running one.
- Unpublishing hides the device from Worlds and rejects new submissions. Existing worlds, jobs, signals, votes, and email rules are retained. A running round may finish; queued/returning jobs wait for the same device to be published again.
- Previously published Signal Dispatch content remains available through the existing archive/dispatch flow. This control manages devices, not individual world records or videos.
- The worker's existing publication filter prevents new rounds on unpublished devices. No OBS playback changes.
- All-unpublished shows an empty state, never sample rooms. Registry errors show a retry state. A changed published-device set resets open room forms so a removed device cannot silently redirect a submission to another device.

## Safety

- Both the admin read and write authorize the signed-in user's stored architect role.
- Removed the old admin-layout behavior that granted architect privileges to missing profiles.
- Publication writes compare the expected visibility to prevent stale-session overwrites; they do not overwrite runtime status or queue data.
- `schema_v69.sql` adds a row-locking submission guard, serialized against publication changes. An already-open form cannot enqueue after unpublication. The guard leaves existing-job state transitions alone, and is service-role-only with an empty search path.
- Preview and local may share production data. Do not click confirmation controls for smoke testing. No test charges or content publication are needed for UI verification.

## Requested Device cleanup (applied 2026-09-02)

- Kept `kyoto-relay-02` published.
- Archived exactly `berlin-origin-01`, `cairo-batch-01`, `gobi-array-07`; each moved from revision 2 to 3 with a corresponding version-history row in one transaction.
- Existing order and fulfillment history was preserved during cleanup.
- No rows were deleted. Original snapshots and order history remain. Restore via the existing Batch editor's Publish Live action after reviewing its content, price and inventory.

## Release state

- Device cleanup is live data, independent of the code branch.
- New admin code was started on `codex/dreamcatcher-publication-admin` and is included in the `codex/worlds-state-video-restore` release together with Worlds playback and chat. The user has authorized production release after write verification.
- Migration v69 applied to production on 2026-09-02 as `dreamcatcher_publication_guard`. Verified the trigger exists, is security-invoker, rejects direct anon/authenticated execution and permits service_role execution. No Dreamcatcher publication status or job rows changed for testing.
- Browser confirmation actions must not be used as tests against the shared production database.

## Verification

- Design check, TypeScript, lint (0 errors / 25 existing warnings), 160 pure unit tests, and production build passed.
- Authenticated browser at 390×844: all four existing Dreamcatchers render; All / Published / Unpublished filters, empty filter state, confirmation and cancel verified. No confirmation submitted against production.
- Page width and content width both 390px; no horizontal page overflow or browser console errors.
- Local screenshot: `tmp/dreamcatcher-admin-390.png` (not a public artifact).
- New guard verified via database catalog/privilege checks; no production mutation used as a functional submission test.
- Existing unrelated Supabase security advisories remain (see the previous release preflight). No advisory names the new publication guard. [Supabase database security checks](https://supabase.com/docs/guides/database/database-linter).

### Create/edit iteration

- No additional database migration or production content write required.
- 198 tests pass, including create defaults, field validation, immutable slug, write-field whitelist, runtime/publication preservation, and original-content concurrency filters.
- TypeScript, lint (0 errors, 25 existing warnings), design checks, and production build pass.
- Authenticated 390×844 browser: create defaults and required fields, edit prefill, read-only slug, disabled unchanged save, invalid-time-zone rejection verified without saving test records to the shared database.
- Actual successful create/edit writes were not exercised against production for smoke testing; pure write-plan tests cover the insert/update contract.
- Replaced native discard confirmation with an inline Keep Editing / Discard Changes prompt after the old native dialog blocked the in-app browser during verification. Final inline-discard interaction verification is pending clearing that old browser dialog; other form checks above completed before the block.
