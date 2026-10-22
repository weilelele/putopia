# Signal Calibration after payment — 2026-10-23

Checkout keeps the existing login, pricing, inventory and duplicate-order safeguards, but no longer requires Signal Calibration. Initiation has no calibration status row. Confirmed paid buyers receive a centered invitation: “Welcome, Voyager” / “Your place in the Collective is secured. Let your signal be heard.” Align opens the existing five-question flow.

Later, Close, Escape and leaving an unfinished quiz defer automatic reminders for at least 24 hours from the server timestamp. The site checks again on entry/return, never with a timer during uninterrupted browsing. Server state is shared across tabs and devices; completed calibration suppresses all future reminders for the current profile version. The success page retains manual access and refreshes pending payment records.

Release scope excludes the separate anonymous checkout and Pack progress work. The confirmed purchase-kind helper is included to distinguish paid Initial from historical membership. A future ownership transfer preserves the cooldown.

## Migrations

Production project: `oxwfnmcwovxnrvagxzdz`. Prerequisite v103 is already applied. Apply `schema_v105.sql` (removes only calibration from reservation prerequisites), then `schema_v107.sql` (private reminder table, atomic RPC, ownership transfer trigger). No checkout switch or price changes. Both migrations were applied successfully on 2026-10-23 before app deployment. Production verification confirms RLS enabled and browser roles denied direct table/RPC access; service_role retains RPC execution.

## Verification

Disposable PGlite checks cover uncalibrated purchases, fulfillment, inventory, duplicate orders, private permissions, 24h minus 1ms, exactly 24h, snooze, concurrent claims, completion and ownership transfer. UI was verified in an isolated fixture environment at 390×844, 320×740 and desktop; the original five questions, deferral, return after a simulated 25 hours, and permanent completion suppression passed. No live payment test or production order is created.

Release checks passed: design guidance, diff whitespace, TypeScript, lint (0 errors; 25 existing warnings), 91 Vitest files / 765 tests, production build, and both PGlite migration suites.
