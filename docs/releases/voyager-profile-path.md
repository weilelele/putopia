# Voyager Path: Pack + Profile

Approved copy: five English questions in `src/lib/voyager-intake.ts`.

- `/voyager-path` now has two equal tasks: Initial Voyager Pack and Establish Your Voyager Profile. Either order is allowed.
- `/quiz` retains its existing intro, one-question-at-a-time layout, question progress bar and completion screen. The outer Path task counter and progress bar have been removed; individual DONE states remain. It now collects two organizational choices, country/region, work, and an observation. There is explanatory feedback but no score or pass threshold.
- United States is the default country; US states/DC and Japan's 47 prefectures are validated. Other requires country and region. Work is free text, including undisclosed work. Sharing is opt-in and unchecked by default.
- Profile answers are private in `voyager_intake`, accessible only through session-checked server actions. They are not added to publicly readable `voyager_profiles`, analytics events, or logs. Only the observation is shared if requested.
- Sharing atomically creates a new world in the London (`london-01`, Parallax Array) round pipeline. It creates its own job, first round and generation request. Existing observations are neither overwritten nor treated as completion. One profile submission per user makes retries idempotent.
- Profile-origin observations bypass the device admission check; the v80 device admission rules remain unchanged. No legacy unfinished-observation index is recreated. Accepted observations wait in the round queue if the array is paused; a missing/unpublished London registry entry fails the entire save with a retryable message.
- New Pack buyers stay Applicants until the new profile is complete. Paid, preparing, shipped and delivered Pack orders qualify. Device claims are not counted as Pack orders; their existing direct membership entitlement and explicit administrator grants remain unchanged. Existing Voyagers/Architects are not downgraded.
- Legacy `task_quiz_at` remains historical and does not complete the new Profile task. Historical quiz admin/editor and old A/B analytics remain legacy; they do not author or measure this new questionnaire.
- Payment webhook retries reconcile membership using the same transactional gate as profile completion. Pack checkout and its product page detect an existing paid Pack and return the user to their path. Payment success copy does not claim activation while either task is incomplete.

## Database rollout

**`supabase/schema_v81.sql` was applied to production on 2026-09-29**, as migration `voyager_pack_profile_activation_v81`, after v80. Post-migration reads confirmed RLS, service-only execution, no anonymous/authenticated intake reads, and the expected indexes. No profile records were created by verification. Confirm London's public registry entry and the existing Dreamcatcher processing pipeline are available. No data backfill, test purchase, or real observation submission was performed during development.

The migration introduces private intake storage, profile-origin observation jobs, and trusted-server-only save/activation functions. It also revokes browser execution of the legacy ungated membership grant RPC; explicit device/admin grants call that helper only from server-only code.

## Verification

Pure Vitest coverage validates all five answers, optional sharing, regional choices and fulfillment states. Isolated in-memory PostgreSQL checks exercise the new migration with minimal dependency fixtures: both task orders, payment-only state, unshared submissions, existing London jobs, idempotent retries, preserved device admission rules, transactional rollback, and denied authenticated access. Those fixtures do not establish production migration compatibility.

UI verification uses the actual Quiz component and built application CSS with mocked load/save actions, so it cannot create real user records. Live payment/webhook and real London delivery require verification after the database rollout.

Verified locally: 51 Vitest files / 356 tests passed; TypeScript, ESLint (zero errors; 26 existing warnings), design diff gate and production build passed. Browser checks covered the 390px question flow, US/Japan/Other changes, non-scored organization choices, save failure/retry with retained answers and consent, 1/2 task progress, and 320px/1280px path overflow. No browser errors were reported. The final task list removes its completion counter and progress bar, as requested; task-level completion indicators and the identity rail remain.
