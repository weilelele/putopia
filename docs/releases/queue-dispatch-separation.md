# Separate device queue from signal delivery

Finished device rounds leave Queue even when Cosmo has not returned assets. My Observations lists the authenticated member’s ongoing records at the selected device, including delayed results and pending feedback. World details explain that device processing has ended. Dispatch continues to show published signal tasks only.

Schema v80 removes the lifetime unfinished-per-member unique index and enforces admission inside the existing serialized submission RPC. New submissions are blocked only while this member has a waiting-capacity, queued or processing round at that device. Returning rounds are never rejected by a member uniqueness constraint. Existing worlds, requests, votes and notification rows are not rewritten. No Cosmo requests or emails are emitted by this migration.

Validation includes pure queue policy tests and isolated SQL coverage for releasing admission after device work, blocking a second waiting submission, preserving idempotency and allowing returning rounds alongside a newer observation. Production migration status is recorded in the PR.

## Queue overview (Plan A, 2026-09-29)

Queue now sits between the device action and three equal-width content tabs: Dispatch, Mine (My Observations), and Live Chat. The first three entries show the active round and next two waiting rounds, or the oldest three waiting rounds if idle. Ordering uses the current round's queued timestamp and round id, matching the scheduler, rather than submission recency. Each row exposes its full observation through a native disclosure; longer queues have a show-all/show-less control. Empty queues take one line.

Guests see the same three tabs with a login prompt in Mine; private records remain filtered on the server. Submission still selects Mine. Completed device rounds still leave Queue, remain in Mine while waiting for assets, and enter Dispatch only through the existing published-material feed. Old saved Queue tabs fall back to Dispatch. Chat has no existing unread-count facility; none is added.

The two-column availability/timing copy is replaced with one short status line, e.g. `OBSERVATIONS OPEN` or `ROUND 4 · QUEUE OPEN`. The help sheet keeps the approximate device duration and explicitly says signals may arrive later. No database migration, backend mutation, Cosmo protocol, voting or notification changes are included.

### Verification

- `design:check`, `tsc --noEmit`, lint (0 errors; 26 existing warnings), 349 pure tests and production build passed.
- Browser verification used the actual room component with temporary local fixture data and dummy local service credentials; the fixture route was removed before commit. No observation, vote or chat was submitted.
- Portrait 390×844: status 12px/18px line-height, single line; three tabs each about 116.7px; empty queue 46px high; no horizontal overflow. Checked 320px and 1440px desktop as well. At 200% text size the changed status, buttons and tabs wrap without widening the page; existing video-overlay/navigation text crowding remains outside this iteration.
- Verified processing-first/oldest-first ordering, individual disclosure, show all/less, Mine awaiting-assets copy, guest login prompt and legacy saved-tab fallback. No browser application errors or framework overlay observed. Fixture video intentionally has no source.
- Reference: user-approved Plan A and supplied crop of the old two-column status. Retained Courier Prime, brand tokens, existing controls and at least 44px touch areas. [Mobile](../design/worlds-queue-overview/mobile.png), [empty/guest mobile](../design/worlds-queue-overview/empty-mobile.png), [desktop](../design/worlds-queue-overview/desktop.png).
