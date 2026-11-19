# Onboarding success → Start Initiation experiment

PostHog experiment: https://us.posthog.com/project/426127/experiments/615350
Flag: `onboarding-initiation-success-v1` (1104372).

## Assignment and UI

User-approved 50/50 `control` / `test` split, with 100% of eligible traffic
entering. Device-ID bucketing keeps the same browser in the same group across
activation and login; different browsers can differ. No server flag evaluation
is used. The existing anonymous-to-user identification and browser checkout
distinct ID correlate outcomes. PostHog excludes people observed in multiple
variants, so identified cross-device users can be excluded from its analysis.
Before enrollment, the browser analytics identity is aligned with the current
auth user, matching Initiation's existing policy. Stale signed-out identities
are reset without resetting the device ID, so later page/paid events do not
start on a different anonymous identity.

Only a successful `/new` submission with a sent access/activation email can
enroll. The code calls the native flag API after that success, then captures
`waitlist_submitted` with the experiment marker and explicit `$feature/` variant
property. PostHog uses this existing event as custom exposure, independently
of SDK-specific native exposure event names. Old pending-email screens with
no enrollment remain control and do not enter. Returning visits, reloads and
browser back/forward cache restorations always show the original inbox-first
screen, including enrolled test browsers. Only the immediate successful-submit
screen uses the experiment variant; the stored browser assignment is retained
for later price/purchase attribution. QA,
previews, internal users and opt-out traffic do not enroll. Unknown flags, SDK
errors and the 1.5-second timeout fall back without counting a control exposure.

Control retains the existing inbox-first screen. Test is the approved version:

- `Your initiation starts here.`
- `Discover the Collective, your Voyager packs, and how to join.`
- Primary `START INITIATION` → `/voyager-initiation?briefing=1`.
- `Activation email sent to`, the email address and Change.
- Secondary mailbox action; no redundant activation or spam-folder reminders.

Campaign-specific onboarding copy and media stay intact. The existing
membership experiment and pricing are not changed.

## Outcome definitions

Both are primary, person-level conversion metrics, independently measured from
the first activated experiment exposure (all assigned eligible submissions,
not only CTA clickers):

1. `initiation_price_viewed` within 24 hours, `is_test=false` and
   `is_internal_qa=false`. This is the formal purchasable price area, at least
   50% visible for one continuous foreground second. Briefing prices do not count.
2. `initiation_purchase_completed` within 7 days, `source=server`,
   `payment_status=paid`, `is_test=false`, `is_internal_qa=false`. The existing
   verified Stripe/Shopify evidence remains required. Checkout creation,
   authorization and browser checkout-completion events do not count.

The variant and opaque device ID travel through the existing checkout analytics
context and outbox. No new database migration, account permission, checkout
product, price or payment side effect is introduced by experiment measurement.

## Verification and rollout

Shared success UI has a development/preview fixture at
`/dev/onboarding-success?variant=test` and `?variant=control`, with local-only
email editing and a link to the existing guest briefing fixture. It does not
send email or enroll users. The fixture is unavailable in production.

Pure tests cover eligibility, missing/disabled flags, timeout/late callbacks,
subscription cleanup, browser-bound enrollment restoration, safe attribution
and preservation of the assignment on a verified paid outbox event.

Deploy the code through a feature-branch PR and squash merge, verify the
production deployment, then launch the PostHog experiment. Do not turn on the
flag before the production code is ready. No real charge or production test
application is needed to validate the rollout.

After launch, inspect sample split and enrollment volume before interpreting
conversion. Allow complete 24-hour/7-day observation windows; the small paid
baseline needs substantially more data than the price-exposure metric. Multiple
primary metrics are separate evidence, not a reason to declare a purchase lift
from a price-exposure lift.

## Return-visit correction · 2026-11-20

The first release also restored the test success UI on later `/new` visits for
an enrolled browser. The user clarified that the test presentation belongs only
to the immediate post-submission screen. Return visits now restore control,
without evaluating the flag or creating another enrollment. Dashboard,
navigation and login CREATE ACCOUNT links lead to `/new?step=cta` and therefore
restore this same inbox screen. The separate restricted-content access gate
retains its existing activation dialog. Browser assignment and the metric
definitions do not change.
Record the corrective production deployment time when comparing pre/post data;
the earlier run includes repeat test-screen presentations.

## Audio scope correction · 2026-11-20

Onboarding, including questions, email entry and both success variants, is now
silent. Its shared soundtrack wrapper and music toggle are removed. Only the
mounted Initiation briefing owns `useBriefingSound`; its gesture-based start,
mute preference and cleanup are unchanged. The onboarding films remain muted.
This applies equally to control and test and does not alter the 50/50 split,
enrollment, CTA destinations or outcome attribution. Record its production
deployment time alongside the other experiment changes. Visual redesigns are
separate concept proposals until the user selects one.
