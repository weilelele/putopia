# Voyager bundle integration

## Purchase contracts

| Offer / order_kind | Server-verified qualification | Charge | New fulfillment |
| --- | --- | --- | --- |
| `standard` | New buyer; no qualifying historical or $48 Initial order | $520 | Packs 1–4 and one Console claim |
| `legacy_upgrade` | Existing eligible $12 historical order | $400 | Packs 3–4; original first two retained |
| `initial` | New buyer | $48 | Membership and Packs 1–2; no Console claim |
| `initial_upgrade` | Confirmed, active $48 Initial order | $500 | Packs 3–4 and one Console claim |

Prices are fixed in cents server-side. The browser requests `initial` or `complete`, never a price or an upgrade tier. Qualifying legacy accounts always keep $400. The new upgrade references its exact Initial order, is rechecked before capture and completion, and consumes no second seat. Initial and upgrade retain separate payments, delivery records and refund provenance.

## Existing checkout and tracking compatibility

- Existing POST bodies without a bundle retain automatic standard/legacy qualification. Existing Stripe product and $520/$400 Price IDs, hosted checkout, origin/auth/calibration checks, manual capture, idempotency keys, webhook route, success URL, attribution and outboxes remain.
- Migration v103 delegates existing standard/legacy reservation, fulfillment completion and fulfillment transitions to their unmodified original implementations. Historical $400 stays distinct from new $500.
- Original `initiation_page_viewed`, `initiation_price_viewed`, `initiation_cta_clicked`, `initiation_checkout_started`, `initiation_purchase_completed` and calibration/reading events remain. PostHog amount fields now accept four exact prices; filter `order_kind='standard'` for the historical $520 funnel. The page defaults to Complete to preserve the existing $520 entry path. An explicit Initial selection is carried through the login redirect and canceled checkout URL.
- The only new client event is `initiation_bundle_selected`. Server purchase events still require captured Stripe evidence and paid DB state. Meta event identity `initiation_purchase_<order UUID>` and server PostHog UUID/time deduplication remain unchanged; no historical events are backfilled.
- Initial completion creates membership without a Console entitlement. Refunding its upgrade freezes the Console while preserving independently active Initial membership and Packs 1–2. Refunding/disputing Initial freezes dependent upgrades. A restrictive Feed insert policy uses effective membership rather than a stale profile badge.
- Shared-region shipping and inclusive tax rules remain. Existing $520/$400 refund allocation stays unchanged. The two new two-pack purchases allocate cancellation refunds across their own two packs; partial-refund access follows the existing policy. FAQ, terms, success copy and pure email templates cover the new distinction.

## Controlled release order

**Production migration has NOT been applied by this change. No live prices, flags, existing payments or customer records have been changed.**

1. Keep `INITIATION_BUNDLES_ENABLED` unset/false. Existing $520/$400 do not require the new price variables.
2. Apply `supabase/schema_v103.sql` after the existing v102 and Feed schemas. This preserves current payments and adds no historical fulfillment. Do not edit an existing versioned migration or reset shared services.
3. Deploy the compatibility code through the repository PR/squash-merge workflow. Leave the bundle flag off during rollout so old webhook instances cannot encounter new order kinds.
4. Audit the two new prices using `node scripts/verification/provision-initiation-bundles.mjs` with the existing approved Stripe environment. The script is read-only by default; `--apply` creates only missing $48/$500 inclusive one-time prices against the already-validated account/product. It never edits $520/$400 or opens checkout. Test-mode provisioning is separately supported by the existing `configure-initiation-stripe.mjs --test` helper.
5. Configure distinct `STRIPE_INITIATION_INITIAL_PRICE_ID` ($48) and `STRIPE_INITIATION_INITIAL_UPGRADE_PRICE_ID` ($500) in the intended environment. Keep `STRIPE_INITIATION_PRICE_ID`, `STRIPE_INITIATION_UPGRADE_PRICE_ID`, existing product and policy settings unchanged.
6. After isolated/test-mode payment verification, set `INITIATION_BUNDLES_ENABLED=true` and redeploy. Terms render at build time, so enabling requires a new build. A preview may share production services: never use it to create live test charges or bulk fixture data.
7. Check each applicable buyer identity, callback replay, shipping rejection, two-phase upgrade, refund/reversal handling and the separate `order_kind` funnel amounts before wider exposure.

Rollback: unset the bundle flag and redeploy; old $520/$400 flows remain. Keep v103 and the compatible webhook deployed for existing new orders and callbacks. Do not roll back database history, delete orders, or return to a webhook build that cannot reconcile the new kinds. Users with new Initial membership retain their rights; new upgrade checkout is closed while the flag is off.

## Validation

- Pure Vitest regression suite; full type check, lint, design gate and production build.
- `node scripts/verification/initiation-bundles-offline.mjs`: executes the real checkout and reconciliation modules with allowlisted in-memory dependencies, tests all four branches, reused sessions, spoofed tiers, feature-off compatibility and revocation-before-capture. No DB/network/env/Stripe calls.
- `node supabase/tests/initiation-v103.mjs <absolute PGlite module>`: isolated PostgreSQL verifies first-two vs Console rights, membership/Feed access, upgrades, refunds/disputes, replay, seats and outbox identities with no shared services.
- `node supabase/tests/initiation-v90.mjs <absolute PGlite module> --bundles`: full existing SQL contract against v103 (legacy eligibility, standard/upgrade, capacity, exact-Unit fulfillment, refunds, direct-REST access and ACLs).
- Browser fixtures: `/dev/voyager-initiation?state=bundles` for new buyers; `state=initial_pack` for $500; `state=legacy_pack` for $400; existing calibrated fixture for feature-off $520. Fixture checkout cannot create a payment.

Live Stripe E2E, production schema application and price activation are separate rollout steps, not claimed by the offline tests.
