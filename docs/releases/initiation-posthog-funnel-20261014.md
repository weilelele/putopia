# Voyager Initiation price and purchase funnel

The page previously exposed a $520/$400 offer without a reliable price-visibility event. This release measures the actual payable price and keeps checkout and paid outcomes separate.

## Events

All events use `page_version=initiation-bottom-payment-v2-20261014`, `batch=S26`, `order_kind`, `payable_amount` (USD 520 or 400), `amount_minor`, `currency=USD`, safe first-touch `utm_source/medium/campaign/content`, and `is_test`/`is_internal_qa`. Browser events in one route visit share `page_visit_id`; the checkout stores that ID for server outcomes. Authenticated events use the same user UUID as the existing login identification. No email, address or calibration answers are added to these payloads.

- `initiation_page_viewed`: once per mounted route visit, independent of the existing generic pageview.
- `initiation_price_viewed`: actual payable-price element at least 50% visible continuously for one second, once per visit/tier. The struck-through $520 in the legacy offer is never observed. The phone route and desktop shell are clipped correctly. Hidden tabs, lost browser focus, open native dialogs and scrolling away restart the second.
- `initiation_cta_clicked`: before navigation, with `next_step=login|calibration|checkout`.
- `initiation_checkout_started`: server-confirmed new or reused valid Stripe session, once per order, with `order_id` and `reused`.
- `initiation_purchase_completed`: only a paid database order with a complete paid Stripe session and a succeeded PaymentIntent whose `amount_received` equals the order amount. Includes `order_id` and `payment_status=paid`. Authorization is not Purchase.

Reports must start at this release and exclude `is_test=true` and `is_internal_qa=true`; legacy sessions have unknown price exposure. The browser environment comes from Vercel's server runtime. Server test flags also check Stripe live mode. Missing environment is excluded, not silently assumed production.

## Release and retry

1. Apply the additive `supabase/schema_v102.sql` migration to MC Home before deploying the application. The file was generated initially through the Supabase CLI and follows this repository's versioned schema convention. It creates a service-only RLS outbox and adds an analytics attribution column. No old paid order is backfilled.
2. Deploy via the normal feature-branch PR and squash merge. Existing PostHog project settings and the five-minute initiation-expiry cron are used. No Stripe products, prices, budget or payment settings are changed.
3. The order-binding/paid-state transaction inserts the outbox row. Each event retains its generated UUID and original timestamp across retries. The worker uses explicit HTTP acknowledgement, safe errors, finite timeouts, capped exponential retry and five-minute claim leases. The Meta Purchase outbox is independent and preserved.
4. Verify ACL/RLS, an empty initial outbox, the production commit and browser events using `?qa=1`. Never replay production webhooks or make a real charge as a tracking test. Real Purchase acceptance requires an actual authorized customer payment; unit and database tests do not claim one occurred.

## Validation

`npm run design:check`, TypeScript, lint, all 688 application tests, production build, and the isolated v102 PostgreSQL harness (27 assertions) pass. The new application tests cover continuous exposure, lifecycle cancellation, mobile/desktop clipping, the legacy payable amount, property whitelisting, CTA branching, captured-payment evidence, refund races, stable retry UUID/time, claim loss and ingestion receipt validation.

The database outbox intentionally has no client policies: anon/authenticated have no grants, service role alone can queue, claim and finish. All new functions use security invoker and a fixed search path.
