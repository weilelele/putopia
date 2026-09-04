# Worldflow legacy progress and media display fix — 2026-09-04

## Root causes

- One legacy world had `current_step = 3` even though its workflow state marked
  Steps 1–7 approved and it already contained Step 5–7 assets. The old progress
  value kept the unified production workspace disabled.
- The desktop `.recordList article` selector also matched nested material cards.
  Its four-column grid collapsed the nested image or video track to zero width.
- Cloud-linked material cards always loaded through the authenticated Worldflow
  asset redirect instead of using the already-associated Forge/Cosmo source URL.

## Resolution

- Reconciled world `94df4041-ec35-4254-a8fe-f2d0c1406e01` to Step 7 with a
  guarded production data update. No other inconsistent worlds were found.
- Scoped record-list layout rules to direct child records so nested media keeps
  its intended dimensions.
- Cloud-linked images and videos now render from their HTTPS Forge/Cosmo source
  URL. The source remains zero-copy; local uploads continue through the
  authenticated Worldflow asset endpoint.

No database migration is required.
