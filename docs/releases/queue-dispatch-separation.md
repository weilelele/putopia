# Separate device queue from signal delivery

Finished device rounds leave Queue even when Cosmo has not returned assets. My Observations lists the authenticated member’s ongoing records at the selected device, including delayed results and pending feedback. World details explain that device processing has ended. Dispatch continues to show published signal tasks only.

Schema v80 removes the lifetime unfinished-per-member unique index and enforces admission inside the existing serialized submission RPC. New submissions are blocked only while this member has a waiting-capacity, queued or processing round at that device. Returning rounds are never rejected by a member uniqueness constraint. Existing worlds, requests, votes and notification rows are not rewritten. No Cosmo requests or emails are emitted by this migration.

Validation includes pure queue policy tests and isolated SQL coverage for releasing admission after device work, blocking a second waiting submission, preserving idempotency and allowing returning rounds alongside a newer observation. Production migration status is recorded in the PR.
