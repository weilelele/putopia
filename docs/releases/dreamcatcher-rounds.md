# Parallax Array round integration — release record

> Public name: **Parallax Array / 视差阵列**. User submissions are **Observations / 观测记录**. `dreamcatcher` remains an internal identifier.
2026-09-27. Release branch: `codex/parallax-release`.

## Included in this release

- Atomic submission creates World, thread, device job, Round 1 and private generation bookkeeping; client UUID deduplicates retries.
- **Existing Cosmo communication is unchanged.** The minute Dreamcatcher cron waits for the same Mongo bootstrap gate and writes the same `cosmo_requests` command: first `{}`, then `{ puzzleType, tiles: [{ assetId, votes }] }`. No external worker API or new secret is required.
- Results use the existing `getWorldExpansions()` read-only Mongo path and the same processed `signal-assets/cosmo/{videoId}.{mp4,webp}` lookup, with original video/poster fallback. The new rounds reuse the extracted original resolver; legacy automation is now retired.
- Each round stores one original command ID plus the sessions already present before dispatch. Transactions prevent duplicate commands and old-session reuse. Read errors retry after five minutes using the same command; they do not request another paid generation. A stuck provider remains visible for investigation rather than silently creating batches.
- Background generation runs independently of the frontend queue. Private results publish only after the device work period ends; late assets release the device slot.
- Actual publication starts a full 24-hour vote window. At least one response at cutoff settles all votes and creates exactly one next round. Zero-response rounds leave the public actionable feed; only the immutable original submitter can subsequently vote and immediately advance.
- Round history, image/video candidates, owner-only continuation, cancellation and an architect operations page are connected. Legacy automation and its recall/engagement emails are disabled. Production pruning and database guards are complete; see [cleanup record](dispatch-retirement-2026-09-27.md).
- Only new result publication queues an email to the immutable original submitter. Transactional leases and provider idempotency deduplicate each round; no historic backfill or churn reminders.

## Existing integration contract

`submit World → existing Cosmo onboarding/bootstrap → cosmo_requests → Cosmo expansion → read Mongo channel/cubicle/assets → private round result → device work complete → published Dispatch → 24h feedback → next cosmo_requests`.

`dreamcatcher_generation_requests` is now only internal bookkeeping, not an inbox that Cosmo must learn to consume. `/api/dreamcatchers/generation`, its claim/callback protocol and `DREAMCATCHER_WORKER_SECRET` requirement have been removed before release. No callback, Portal authentication, Forge API call or new provider schema is introduced.

The existing protocol has no per-request result echo. Correlation relies on one outstanding round per world, retired legacy scheduling and exclusion of pre-dispatch sessions, including incomplete ones. Manual extra generation for the same world can remain ambiguous; do not claim provider-level exactly-once processing. Existing Cosmo onboarding must be operational as before. Asset URLs already published in Cosmo/Storage retain their existing visibility; the application gate controls when Dispatch reveals them.

## Production migration and activation

- `supabase/schema_v77.sql` applied successfully on 2026-09-27 as `parallax_array_rounds_and_publication_notifications`, after v78. No historical jobs were converted. Round/generation/submission/notification tables are private; mutating RPCs are restricted to the service role.
- v78 cleanup/protection was applied and verified: 50 empty tasks and 173 asset associations deleted, 1,353 votes preserved. Its protection remains enabled.
- The application is released through the `codex/parallax-release` PR, squash merge to `main`, and the existing Vercel Git integration. Required existing configuration: `COSMO_MONGO_URI`, Supabase service connection, `CRON_SECRET`, and `RESEND_API_KEY`. No new worker configuration is needed.
- Only publication-ready results email the original submitter. No historic jobs or emails are replayed. Other Parallax Array emails and push notifications remain disabled.
- No live submissions, votes, paid generation requests or external emails were sent for verification. A real Cosmo generation → media retrieval → delivery → Round 2 cycle remains an operational check after a real submission; local/preview verification does not establish provider delivery.

## Cosmo repository investigation — 2026-09-27

Authenticated local GitHub CLI access confirms read/write access to [arthurjis/cosmo-app](https://github.com/arthurjis/cosmo-app). The GitHub connector's installed-repository listing omitted this collaborator repository; its empty search result was not evidence that the user lacked access. Inspected default branch revision: `9aa8da6b5a7f43226ebdfb62171ef103a81dbc5d`.

- [Existing camera integration](https://github.com/arthurjis/cosmo-app/blob/9aa8da6b5a7f43226ebdfb62171ef103a81dbc5d/docs/device-camera-embed.md) confirms the previous Putopia integration: `/embed/:channelId/:bandId`, read-only snapshots, server-time playback and a 30-second refresh. It explicitly does not generate or schedule content. A working stream alone does not connect a submitted dream to generation.
- [Application configuration](https://github.com/arthurjis/cosmo-app/blob/9aa8da6b5a7f43226ebdfb62171ef103a81dbc5d/app.config.ts) routes requests to `https://cosmo-server-hk1.putopia.studio/`.
- [Forge client](https://github.com/arthurjis/cosmo-app/blob/9aa8da6b5a7f43226ebdfb62171ef103a81dbc5d/src/shared/domains/forge/forge.service.ts) starts images with `POST /api/portal/forge/:channelId/:bandId/image` and polls `GET /api/portal/forge/image/:imageId/status`; video has equivalent start/status routes. The client sends the Portal user's Bearer token. GitHub repository access is not a generation API credential.
- [Forge request types](https://github.com/arthurjis/cosmo-app/blob/9aa8da6b5a7f43226ebdfb62171ef103a81dbc5d/src/shared/domains/forge/forge.types.ts) expose provider/model/prompt and optional reference images, but do not establish a World/round/request idempotency or settled-vote contract. Do not assume direct Portal generation implements the existing MCo worker.
- Putopia's `schema_v54.sql` documents the distinct existing integration: append `cosmo_requests`, consume by world and monotonic ID, track `channel.mco.lastProcessedRequestId` in Mongo. This iteration reuses that contract. New round threads are excluded from the legacy daily emitter, so the two application paths cannot issue competing requests for one round.

The backend source is not a prerequisite for this iteration: the user explicitly confirmed that the existing Dispatch communication and media flow must remain unchanged. No Cosmo source was changed or pushed, and no live generation API was invoked.

## Validation

- `npm run design:check`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: no errors; existing warnings remain.
- `npm test`: 49 files / 341 tests passed; additional round feed tests use a mocked fetch with no network or credentials.
- `npm run build`: passed.
- `scripts/verification/dreamcatcher-rounds.mjs`: isolated PostgreSQL WASM execution of the actual v54/v67/v78/v77 SQL in production migration order against a minimal existing-schema fixture; checks publication, voting/settlement, immutable owner fallback, queue capacity, pausing, late results, Cosmo command deduplication and old-session rejection and protected RPCs, publication-only email claims and expiry. This is not a substitute for testing the production schema or the existing live Cosmo service.
- Browser fixture checked at 390×844 and 1440×900. Round labels, fallback explanation, image options and selection state verified; no form submitted. Temporary fixture removed. No browser errors recorded.

Reproduce isolated SQL checks without connecting services:

```sh
npm install --prefix /tmp/dreamcatcher-sql-check --no-audit --no-fund @electric-sql/pglite@0.5.8
node scripts/verification/dreamcatcher-rounds.mjs /tmp/dreamcatcher-sql-check/node_modules/@electric-sql/pglite/dist/index.js
```

Use the installed test runtime version recorded at verification time; no dependency was added to the application. Vitest remains pure and does not run database checks.
