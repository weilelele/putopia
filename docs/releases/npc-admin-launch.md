# NPC admin launch

## Scope

Release `/admin/npcs`, the NPCS admin navigation entry, profile creation/editing/avatar upload, and explicit device allocation/release controls. Public comment identity UI remains in the separate unfinished feature work and is not part of this release.

Imported ten existing fictional profiles by exact Auth UUID and matching `@putopia.internal` email: Amara Okafor, Ines Cavalcanti, Luke Brandner, Maren Solberg, Page Chen, Ryo Tanaka, Saoirse Flanagan, Shen Zhimeng, Tariq Osei and Valentina Cruz. Their IDs, names, bios, avatars, story roles, emails, login settings and historical comments are preserved. Import changes only `account_kind` and saves a before-state audit.

Dhruv Mehta appears in an old setup script but has no matching live account; no duplicate or new Dhruv account was created. No device was allocated during import. Administrators choose allocations explicitly in the new page.

## Production database

Applied to MC Home (`oxwfnmcwovxnrvagxzdz`) on 2026-09-16:

- `schema_v71.sql` / `npc_accounts_and_device_allocations_v71`: NPC profile field, service-only allocation transactions and inventory integration.
- `schema_v73.sql` / `classify_verified_legacy_npcs_v73`: exact-match legacy classification and before-state audit, preserving all existing Auth settings.

The earlier proposed v72 import was rejected by automatic approval review because it would clear emails and impose long Auth bans. It was never applied and is not included in the release. The accepted v73 import omits both changes. Newly created NPCs still follow the separately implemented creation flow; existing imported accounts retain their previous settings.

## Validation

- TypeScript, design check, full lint (zero errors), all 298 tests, and full production build passed in a clean release checkout from current main.
- Offline PostgreSQL verification passed for allocation/release idempotency, Checkout capacity, existing payment/refund transitions, pool preservation, comment ownership and service-only permissions.
- Legacy import verification passed: 10 exact identities, abort on active sessions, roles/IDs/email/login settings preserved, audit snapshots written, inventory unchanged.
- Previous mobile/desktop component fixture verification covered profile creation and allocation controls. Production route verification follows deployment.
