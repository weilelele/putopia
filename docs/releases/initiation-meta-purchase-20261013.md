# Voyager Initiation Purchase delivery

The new membership Checkout previously completed payment and entitlements without sending Meta Purchase. This release records one outbox item in the same transaction that marks an Initiation order paid, then sends the event immediately and retries delivery through the existing five-minute production cron.

## Release order

1. Apply `supabase/schema_v97.sql` to MC Home before deploying this application. It adds `meta_attribution`, the service-only outbox and claim RPC. It does not backfill historical orders.
2. Verify the migration, trigger, RLS/ACL and RPC are present. Existing `META_CAPI_ACCESS_TOKEN`, `META_DATASET_ID` and `CRON_SECRET` production settings are required. Do not copy credentials into this document.
3. Deploy main through the normal squash-merged pull request and confirm the production domain serves that commit.
4. Complete one explicitly authorized real $520 payment, then verify payment, membership/fulfillment records and the corresponding outbox record. Do not treat the independent Stripe sandbox as production acceptance.

## Event and retry contract

- Event ID: `initiation_purchase_<order UUID>`. Event time is the original `paid_at`; retries retain both.
- Standard value: `520`, legacy upgrade value: `400`; currency `USD`, content ID `voyager_initiation`, source `/voyager-initiation`.
- Delivery re-reads the paid order and Stripe session, checking binding, amount and live mode. It cannot capture or cancel a payment.
- A failed Meta request preserves the completed payment and entitlements. The outbox retains a safe error, attempt count and retry time. Stale processing leases recover after five minutes; completion requires the same claim token.
- Network ambiguity can repeat the same event ID; Meta deduplication prevents a new Purchase identity. `sent` means the API accepted one event, not that ad attribution is verified.
- iOS native purchases are excluded. Browser attribution is captured at initial Checkout, rather than from Stripe webhook headers.
- Stripe test events require an explicit Test Event Code. Live events never include a test code, even if one is configured.
- The cron reports HTTP 503 when delivery needs retry. Watch `status`, `last_error`, `attempt_count` and `sent_at`, not only the scheduled invocation status.
- `skipped` is terminal. If a reviewed/refunded order is later manually restored to paid, review its outbox state explicitly before any recovery; do not replay old payment webhooks as a tracking test.

## Validation

- 616 application tests pass, including pure injected tests for payload binding, mode isolation, retries, lease loss, refunds and attribution.
- The v97 in-memory PostgreSQL harness passes 31 assertions covering transaction rollback, fixed identity/time, permissions, stale leases, backoff and sent-event exclusion. Run `node supabase/tests/initiation-meta-v97.mjs <absolute path to PGlite dist/index.js>` with an independently installed PGlite package; no production environment or network is used.
- TypeScript, lint and the production build pass; lint reports 25 existing warnings outside this change.

## Production acceptance record

Record the deployed commit, real order ID, Stripe paid status, outbox event ID, `sent_at`, Meta receipt/visibility and any remaining attribution limitation. Never record tokens, card details or customer addresses. No real payment has been performed as part of the code validation above.

Migration `20261013155831` (`v97_initiation_meta_purchase_outbox`) was applied to MC Home before application deployment. Read-only verification confirmed the attribution column, payment trigger, RLS, service-role CRUD/claim permissions and denied anon/authenticated reads. The empty outbox confirms no historical backfill. The security advisor's no-policy notice is intentional for this service-only table: clients have no table grants, and service role bypasses RLS.
