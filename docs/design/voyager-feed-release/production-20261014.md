# Voyager Feed production release — 2026-10-14 (Asia/Shanghai)

Live: https://www.multiverseco.org/voyagers

- User explicitly accepted skipping isolated real write integration and authorized production migration, formal release and post-release checks.
- PR #225 squash-merged into main: `6e91b58ab71b15b6e491106a0e95a153d5b2f9e1`.
- Production deployment `dpl_9GfQoM8khSCVSxMcEsAuFiH9KJpx` is READY; custom domains assigned, aliasError null. Build approximately 101 seconds.
- Production main CI run 38483827659: success. Merged feature branch deleted remotely and locally; local checkout synchronized to main.

## Production migrations

Target MC Home `oxwfnmcwovxnrvagxzdz`:

| Migration | Recorded version | Result |
| --- | --- | --- |
| v99_voyager_feed | 20261013230012 | applied |
| v100_voyager_feed_npc_attribution | 20261013232154 | applied |

The first v100 tool request expired without applying. Read-only checks confirmed absent creator_id and no migration-history record before retry. Retry succeeded.

Verified entries/likes RLS, security_invoker view, creator_id NOT NULL/default auth.uid(), enabled immutable-identity trigger, creator-only edit/delete policies, Architect/human NPC publishing policy, private 5 MB image bucket and bucket-scoped Storage policies. No production QA fixtures were inserted.

## Post-release evidence

- Production authenticated Applicant loaded the empty Feed through real session/server/database reads; Share an update correctly opened the Voyager Initiation permission dialog.
- Members loaded live roster/batches; Logs loaded published stories; Feed return worked.
- Public HTTP Feed/Members/Logs routes: 200 with private/no-store cache behavior.
- Anonymous Supabase REST queries for entries, likes and view: 401, no content.
- Authenticated database role without an identity: reader false, visible rows zero (read-only transaction).
- Anonymous private media route: 404, private/no-store. Submission result lookup: 503, private/no-store, no content (current generic error behavior).
- Development preview route: streamed HTTP 200 with NEXT_HTTP_ERROR_FALLBACK;404; no Local QA or Preview identity controls in content. Not an exposed fixture UI.
- Production browser console: no errors captured.
- Deployment-scoped error/fatal runtime scan, 23:15–23:25 UTC: no matching logs. This is a point-in-time check, not ongoing monitoring.
- Screenshots: production-feed-20261014.png and production-permission-20261014.png.

## Explicit verification limits

Real post/reply/upload/edit/delete integration was skipped at the user's request. Physical-phone keyboard/safe-area checks remain unperformed. Earlier PGlite and local adapter tests do not replace those checks.

For phone acceptance, open the live HTTPS URL. First check navigation and keyboard/close behavior without publishing. Any actual submitted post is real production content. Report device, OS, browser and any screenshot of obstruction. See phone-acceptance.zh.md for the broader original staging checklist; its isolated-account prerequisites were not completed.

If a functional rollout issue appears, revert/promote the prior application release while preserving additive tables and member content. Do not drop Feed tables or the private bucket as an automatic rollback.

This record supersedes earlier HOLD/not-applied statuses as a release outcome; it does not retroactively mark waived checks as passed.
