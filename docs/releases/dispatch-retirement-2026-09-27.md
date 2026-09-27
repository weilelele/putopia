# Dispatch retirement and backlog cleanup — 2026-09-27

## Production changes completed

User authorized deleting unvoted World feedback except the immediate unvoted successor of each voted round, retiring related notifications, and keeping only new Parallax Array result-ready mail to the original submitter.

Applied `supabase/schema_v78.sql` to MC Home (`oxwfnmcwovxnrvagxzdz`) through the Supabase migration API as `retire_legacy_dispatch_and_prune_unvoted`. This migration intentionally works before v77; it does not depend on deployment of the new round application.

| Data | Before | After |
| --- | ---: | ---: |
| World-linked Dispatch tasks | 247 | 197 |
| Voted tasks | 141 | 141 |
| Unvoted tasks | 106 | 56 |
| Task asset associations in scope | 1,244 | 1,071 |
| Votes | 1,353 | 1,353 |

Selection orders tasks within each world by publication time (creation time for drafts), then day index and ID. Every voted task survives. An unvoted task survives only if its immediately preceding task was voted. Thus a voted→empty→empty sequence keeps the first empty task only. Worlds with no votes lose all their empty feedback, but the World itself is retained. Unlinked tasks and original numbering are unchanged.

Selection, backups, deletion and vote-preservation assertions ran in one transaction while holding table locks against concurrent voting/authoring. Public task rows and their cascading asset associations were deleted; physical Cosmo/Storage media were not deleted because they can be shared with live playback or retained content.

Private backup: `maintenance.dispatch_retirement_backup`, inaccessible to public/anon/authenticated roles, with RLS enabled. It contains 247 tasks, 1,244 assets, 1,353 votes, 27 threads, 234 Cosmo requests, and 2 device jobs. No recall log rows existed. Recovery SQL: `scripts/maintenance/restore-dispatch-retirement.sql` (operator-only; not executed). It restores content without restarting automation.

Four production database guards block old request insertion, old Cosmo batch import, recall reservations and engagement reservations. The old deployed senders skip recipients when reservation inserts fail, so these guards stop those email/push paths before application deployment. Existing legacy device jobs were withdrawn with their original values backed up. No World lifecycle/ownership or vote was changed.

A read-only Mongo cursor check confirmed the latest existing requests (through ID 258) were already consumed. Request history was preserved. An in-flight Cosmo generation may still finish; the import guard prevents it from recreating deleted legacy feedback. The guard does not cancel work inside the external service.

## Application changes in this release

- Removed old `/api/cron/cosmo-sync` and `/api/cron/signal-recall` schedules.
- Disabled the underlying generation/import/recall/engagement entry points, including direct calls. Existing Scan success/failure notifications remain disabled.
- Dreamcatcher queue cron handles new rounds only; it no longer advances the retired legacy device queue.
- New rounds still use the original Cosmo command format and Mongo media reads. The dispatch RPC marks its transaction so the retirement guard permits this explicitly authorized new-round path.
- Publication atomically inserts one `dreamcatcher_notifications` row. Queued/pre-generated assets never create mail. No historic mail is backfilled.
- The new notification cron emails only `dreamcatcher_rounds.initiator_id`, once per round, with a link and the actual voting deadline. No owner-absence, voter-churn, zero-feedback reminder, participant broadcast or AI-copy alert remains.
- Leased notification claims and a stable Resend idempotency key prevent overlapping delivery. Transient failures get at most three attempts; expired/cancelled/stopped rounds are not recalled. Registration, order and other unrelated emails are unchanged.

## Release status and checks

- v78 cleanup/protection: applied and independently verified in production.
- v77 new rounds/notification outbox: applied to production on 2026-09-27 as `parallax_array_rounds_and_publication_notifications`.
- Application release: `codex/parallax-release` → squash merge to `main` → Vercel production. No test emails or paid generations were sent; real provider delivery is not claimed as verified.
- Isolated SQL verification covers v78 retention/backup/vote preservation and production-order v78→v77 compatibility, round voting rules, command guards and publication-only notification claims.
- Vitest uses mocks only; final test/build results are recorded in the Dreamcatcher release note.

Deploy the tested new application with v77, the existing Cosmo/Supabase/cron credentials and Resend configuration. Keep v78's protections enabled. Do not replay archived jobs, old requests, or old notification logs as part of launch.
