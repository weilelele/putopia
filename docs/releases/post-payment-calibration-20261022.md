# Signal Calibration after payment

> 2026-10-23: session-only deferral has been replaced by a server-side 24-hour cooldown and site-wide entry checks. See [the current reminder rules](calibration-reminder-24h-20261023.md). Earlier verification below describes the first implementation.

2026-10-22 用户确认：保留原五道题；取消付款前的 Signal Calibration 限制；付款后先弹提醒，点击 Continue 后进入现有流程，可选择 Later。Initiation 页面不再显示校准是否完成的状态行。

## Behavior

- Purchase CTA and server preflight proceed without a saved intake. Seat reservation uses the new `schema_v105.sql` definition of `reserve_initiation_v2`, retaining pricing, inventory locking, existing-order checks and service-role-only execution.
- Only server-confirmed paid Initial, Complete or upgraded purchases invite an uncalibrated buyer. A redirect, role, grant, pending payment, refund or dispute cannot establish payment success.
- The success page refreshes pending payment records every four seconds, up to 15 visible-page attempts; a manual refresh remains available. This only re-reads records and does not capture payments or grant access.
- The site-wide coordinator shows the centered ArchiveSheet reminder. Align opens the existing five-question modal; Later, Escape and Close defer it for at least 24 hours before the next site entry.
- Reminder copy: “Welcome, Voyager” / “Your place in the Collective is secured. Let your signal be heard.” / “ALIGN →” / “LATER”. Current timing and completion suppression follow the 2026-10-23 rules above.
- Success retains a button for reopening calibration after deferral. The existing `/quiz` route remains available for later completion. Initiation has no calibration status row or permanent calibration control.
- Question wording, answer choices, validation and optional observation sharing are preserved. Intro/completion copy no longer describes calibration as a payment prerequisite. Existing unsaved-change and submission protection are retained.
- Payment still establishes membership and fulfillment independently of calibration. This change does not open checkout, change prices or apply a production migration.

## Migration status

`supabase/schema_v105.sql` was **applied to production** project `oxwfnmcwovxnrvagxzdz` on 2026-10-23 (migration version `20261022212401`). It follows the previously applied v103. The app was released through [PR #251](https://github.com/weilelele/putopia/pull/251), squash commit `f96c329cf2ca3752263b3663b53244a34de725f4`. Earlier versioned migrations were left unchanged.

## Verification

- `npm run design:check`, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` passed. Lint has existing warnings outside the edited feature.
- 95 Vitest files / 786 tests passed at the final full run, including payment eligibility and checkout-without-calibration cases.
- `supabase/tests/initiation-post-payment-v105.mjs` passed against disposable PGlite PostgreSQL: uncalibrated Initial/Complete/historical upgrades, immediate paid access, idempotency, capacity, upgrade seat reuse and function ACLs. No live database or Stripe writes.
- 82 offline handler assertions passed using the existing `initiation-offline.mjs` harness in a temporary copy, adding the pre-existing guest-checkout pure dependency and an anonymous-identity adapter. The repository harness was left unchanged. This is simulated SDK verification, not Stripe E2E.
- Browser verification used a temporary Next copy without project env files, with analytics disabled and local-only quiz saves. Verified 390×844, 320×740 and 1280×900; original five-question completion; Later plus reload suppression; direct unpaid CTA preflight without a quiz; Escape/Keep editing/Discard behavior.

## Visual evidence

Reference: existing `ArchiveSheet`, design system C24 and the existing calibration flow. The reminder adds no new modal shell or visual language. Phone dialog remains centered; at 320px its width is 272px with 24px side clearance and no horizontal overflow.

- [390×844 reminder](../../output/post-payment-calibration/mobile-reminder.png)
- [320px reminder](../../output/post-payment-calibration/narrow-reminder.png)
- [Desktop reminder](../../output/post-payment-calibration/desktop-reminder.png)
- [Original first question](../../output/post-payment-calibration/mobile-question-1.png)
- [Calibration completion](../../output/post-payment-calibration/mobile-completed.png)
- [Checkout without calibration row](../../output/post-payment-calibration/mobile-checkout.png)
