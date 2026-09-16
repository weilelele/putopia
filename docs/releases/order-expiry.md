# Unpaid order expiration

Production runs `/api/cron/order-expiry` every five minutes. The job considers all product types in `voyager_orders` with `status = pending`, no `paid_at` or recorded PaymentIntent, and `created_at` at least 48 hours ago. Existing Stripe expiration webhooks can release abandoned checkout holds sooner; this job is the missed-webhook fallback.

Before cancellation, the job verifies Stripe. Paid, completed (including asynchronous payments), unknown, mismatched, or unverified sessions are retained. Open sessions must be expired successfully first. A remaining PaymentIntent must be canceled. Orders that never attached a session can be canceled after 48 hours.

The database update repeats the pending/unpaid/age/session conditions to avoid overwriting concurrent payment confirmation. Existing transactional triggers return reserved device Units and decrement the Batch reservation count, preserving Unit audit events. Orders remain in the database with status `canceled`. Repeated execution is safe.

The endpoint requires `CRON_SECRET` and `VERCEL_ENV=production`. It is disabled on shared-data previews. Per-order failures are logged, other orders continue, and partial/failed runs return HTTP 503 for operational visibility. Stripe requests have bounded timeouts. Keyset pagination avoids skipping rows as they are canceled.

No schema migration is required. Verification uses pure dependency-injected tests without database, network, or environment access. Production verification should inspect order statuses and Batch/Unit counters after the cron runs; never create test purchases in production.
