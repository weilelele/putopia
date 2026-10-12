# Signal email and 36-hour voting — 2026-10-06

Restores the previous world-confirmation email's full-page dark background, original brand assets, content panel and orange action button using the current design-system palette. Mobile-first table layout, 12px minimum type, Courier Prime with email-safe monospace fallbacks. Plain-text alternative and existing send/retry/idempotency policy remain intact.

Preview: `preview.html`, `mobile.png` (390×844; full-page capture). Example content and deadline are illustrative. Verified both logo assets loaded and no horizontal overflow. Browser preview is not an inbox-client compatibility certification.

Production migration: `supabase/schema_v86.sql` applied successfully through Supabase MCP as `signal_voting_36_hours`. Verified all 17 open rounds have exactly 36-hour windows; new publications use 36 hours. Waiting rounds get 36 hours on publication. Historical settled/cancelled rounds were preserved. Existing notification records were not changed or resent. Previously sent email deadlines cannot be updated.

Email template and in-app 36-hour copy are local source changes and require application deployment. The SQL migration preserves the current deployed publication function, checks the exact duration expression before replacement, uses the scheduler advisory lock, and only extends existing 24-hour open rounds, so retries do not add more time.

Validation: design check and TypeScript passed; lint has no errors (26 existing warnings); 64 test files / 456 tests passed. Build result recorded in chat.
