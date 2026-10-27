# Signal Calibration reminder: 24-hour cooldown

2026-10-23 用户确认：点击 Later 后至少间隔 24 小时，下次进入网站时再提醒；完成信号对齐后不再提醒。

## Behavior

- Reminder state is stored per verified user on the server. Tabs, browsers and devices share the cooldown. No quiz answers or payment details are stored in the reminder table.
- The first eligible paid visit may show the existing invitation. Each automatic invitation atomically records its server timestamp; simultaneous checks cannot claim it twice.
- Later, Escape, Close and leaving an unfinished quiz reset the cooldown from the time the server handles deferral. Explicitly opening the quiz also postpones automatic reminders.
- The root layout checks on initial entry, returning to the visible website, browser page restoration, sign-in/account changes and confirmed payment return. There is no elapsed-time timer that opens a popup during uninterrupted browsing.
- Ordinary site pages are covered, including Dashboard. Login, registration, auth callbacks, onboarding, the standalone quiz, offline, admin, studio and dev fixtures do not receive automatic reminders. Moving between ordinary pages does not reset the entry check. An existing dialog is allowed to finish before a claimed invitation appears.
- The private RPC verifies current paid membership, active fulfillment entitlement where needed and saved calibration before claiming a reminder. Completion permanently suppresses future invitations for the current five-question profile version. A missing migration or data error suppresses the reminder without blocking the site.
- A successful quiz save notifies other tabs to recheck server completion. The completing tab keeps its completion screen until Done.
- Guest purchases transferred to an existing account carry their reminder timestamp; the later timestamp wins if the destination already has a cooldown.
- The ceremonial copy, original five questions, payment flow and absence of an Initiation status row are preserved. The success page retains its manual calibration button.

## Deployment

`supabase/schema_v107.sql` was **applied to production** project `oxwfnmcwovxnrvagxzdz` on 2026-10-23 (migration version `20261022212602`), after v105 (`20261022212401`). It adds an RLS-enabled, service-role-only table, an atomic reminder RPC and a membership ownership transfer trigger. Production verification confirmed browser roles cannot read the table or execute the RPC. `v107` does not modify checkout rules or open payments.

Released through [PR #251](https://github.com/weilelele/putopia/pull/251), squash commit `f96c329cf2ca3752263b3663b53244a34de725f4`. Vercel production deployment `dpl_GLwjwXXXQgGUiQvKtSq9s5LgkR1j` is READY and serves `www.multiverseco.org`. Release was isolated from main and excludes separate anonymous checkout and Pack progress work; the original working checkout was preserved. The isolated release passed 91 test files / 765 tests, typecheck, lint (0 errors, 25 existing warnings), design check, build and both PGlite migration suites. GitHub CI and preview passed before merge. Production browser verification at 390×844 confirmed the status row is absent, prices are configured, and there is no horizontal overflow or browser error. Initial production runtime error query returned no entries. No live payment or real-user calibration was created as a test. Direct Python HTTP checks returned 403; browser checks of the production site succeeded.

Release evidence: [production mobile checkout](../../output/post-payment-calibration/release/production-mobile.png).

## Verification

- `npm run design:check`, `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`: passed. Lint retained the existing 26 unrelated warnings and no errors. Vitest: 96 files, 814 tests.
- `supabase/tests/calibration-reminder-v107.mjs` passed on disposable PGlite PostgreSQL: initial invitation, 24h minus 1ms, exactly 24h, snooze reset using server time, duplicate claims, independent users, permanent completion suppression, revoked/NPC access, ownership transfer and private table/function permissions.
- Browser verification at 390×844 used an isolated Next copy without project environment files and with analytics disabled. Reminder and quiz server actions used local fixture adapters; production was never written. Verified invitation on `/privacy`, Later and reload suppression, return after 25 simulated hours, original five-question completion, retained completion screen and no reminder after completion even with a year-old timestamp.
- The SQL test verifies the real database policy; the browser test verifies the actual site coordinator and dialogs with simulated persistence. No live Stripe or production E2E claim is made.

Evidence: [site-wide entry](../../output/post-payment-calibration/24h/global-entry.png), [completion](../../output/post-payment-calibration/24h/completed.png), [quiet completed return](../../output/post-payment-calibration/24h/completed-return.png).
