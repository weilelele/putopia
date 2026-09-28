# Observation intake compatibility — 2026-09-28

The first round used `syncing` immediately on creation and replaced the legacy timestamp ID with a UUID. The queue also assumed any world outside `syncing` had ended. The existing Cosmo bootstrap was never observed for the first real submission. This change restores the known local intake contract; it does not assert an unverified Cosmo backend filter.

## Change

- Both the ordinary World submission and the Parallax Array round transaction call the same service-only `create_observation_world` insert: `proposed`, unverified, original observer/content fields, `PROP-` plus uppercase base-36 milliseconds.
- Ordinary submissions keep their existing 8–10h scanning window. Device submissions keep `scan_until=null` at submission and set it to the first device round deadline when processing begins, as the old device entry did. New round publication continues to depend on private assets plus the presentation deadline, not the legacy scanning clock.
- A first, unpublished round remains active in `proposed`/`picked`. Once the existing read-only Cosmo check confirms bootstrap, the existing dispatch RPC promotes it to `syncing` atomically with its first unchanged `cosmo_requests` command. Later rounds keep the existing lifecycle fences.
- Existing Cosmo protocol, media retrieval, vote settlement, 24h owner fallback, notification rules, and legacy retirement guards remain intact. No Cosmo repository or database is modified.
- Previously created IDs are preserved. The affected observation can have its first intake state restored only after checking it has no Cosmo channel/command/result; its original round and device deadline are retained.

## Verification and rollout

`schema_v79.sql` is an additive migration replacing only the affected RPCs and introducing the shared insert. Apply before the server-action deployment. Prior versioned migrations are unchanged.

Isolated PostgreSQL tests cover proposed first-round survival, preservation of scan start/deadline, bootstrap-only promotion, service-role restrictions, submission-key deduplication, both entry paths, stopped/graduated worlds, unchanged round 1→2→3 voting, media fencing and publication-only mail. These tests cannot prove the external Cosmo onboarding worker is running or selecting new worlds. That remains a live readback check after restoring the affected observation.

## Production record

- Applied v79 to MC Home on 2026-09-28 as `restore_legacy_observation_intake`.
- Rechecked the affected observation had no Cosmo channel, command, result, or published task. Restored only its lifecycle to `proposed` and its first scan deadline to the already-completed presentation deadline. World ID, submitted content, Round 1, queue history and submission key were preserved.
- Original World snapshot retained privately in `maintenance.dispatch_retirement_backup` under `source_table='observation_intake_worlds_v79'`. No old generation jobs were restarted.
- Local verification: design check, TypeScript, lint (0 errors), 341 tests, production build, and isolated SQL flow checks passed.
- External intake has not yet been confirmed. This release restores the known legacy entry contract; it does not claim the unavailable Cosmo consumer's selection rules have been inspected.
