# Android Web Push — prepared, sending locked

## Scope and deployment

Adds standard Web Push beside (without changing) existing iOS APNs. Migration
`supabase/schema_v110.sql` was applied to MC Home (`oxwfnmcwovxnrvagxzdz`).
The three new tables are service-role-only, RLS enabled, with no anon/member
grants. Configuration is initialized once by the server; only the public VAPID
key is exposed. Never rotate the key casually: existing browser subscriptions
use that key. `sending_enabled` starts false and has no public write endpoint.

## Member flow

An Android member opens My Profile, chooses ENABLE NOTIFICATIONS, approves the
browser prompt and registers this browser subscription. Turning notifications
off disables the server record before unsubscribing. Signing out unsubscribes
the browser. First release requires login so purchases and opt-out suppression
can use the actual account; anonymous A contacts cannot receive a targeted push
until they sign in and opt in. Historical PWA installs are not auto-subscribed.
No notification is sent by registering or loading these pages.

Turning off is a separate action: if another tab already removed the browser
subscription, it stays off and never creates a new subscription. Before enabling,
the page probes the active worker for push support. An explicit enable action
can activate a waiting push-capable worker; subscription and consent storage wait
for activation and a successful capability reply. If that fails, the page asks
the member to close all Console tabs and reopen, without reporting success.

## Operator API and UI

- `GET /api/push/web/subscription`: public key, locked status, own endpoint hashes.
- `POST /api/push/web/subscription`: authenticated same-origin explicit consent.
- `DELETE /api/push/web/subscription`: disables only the signed-in owner's endpoint.
- `POST /api/push/web/campaign`: architect session + same-origin, or a separately
  configured `WEB_PUSH_CAMPAIGN_SECRET` bearer. Default action is `preview`.
- `/admin/web-push`: architect-only counts and a PREVIEW ONLY form; no send button.
- `POST /api/push/web/events`: unguessable per-delivery capability token, same-origin,
  monotonic display/click timestamps; no permission to read records or send.

Campaign body:
```json
{
  "action": "preview",
  "spec": {
    "campaignKey": "voyager-invitation-draft",
    "title": "Voyager is open",
    "body": "Take a look inside the Console. Your initiation begins here.",
    "route": "/voyager-initiation?briefing=1",
    "userIds": ["<explicit account UUID>"]
  }
}
```

Each batch is limited to five subscriptions to fit the server execution window.
A response includes `nextCursor` when more devices remain, including when one
account has more than five devices. Pass that value as top-level `cursor` with
the same campaign spec to continue; stop when `nextCursor` is null. Ordering is
by subscription UUID with an exclusive cursor, so disabling an earlier device
does not shift subsequent pages. Each request retains authorization, explicit
recipients, the send lock, opt-out checks and campaign/device deduplication.
The admin form exposes PREVIEW NEXT BATCH only; editing any field resets paging.
A recipient list is mandatory. There is no implicit broadcast-to-all default.
Duplicate campaign/subscription sends are skipped, including uncertain failures.
Do not retry a claimed delivery under a new key without investigating its log.
Provider 404/410 disables stale subscriptions. Provider accepted ≠ displayed.

## Release hold: do not send

The user explicitly requires a later instruction to send. Until that instruction:
keep `web_push_config.sending_enabled = false`, use `preview` only, do not run a
real test push, do not create a scheduler and do not invoke `webpush.sendNotification`
against a real subscription. A future real send additionally requires
`action: "send"` and `confirm` exactly equal to `spec.campaignKey`.

Before a future send, freeze approved copy and recipients; recheck purchases,
permission/opt-outs and mutually exclusive H/R/B/A segments; perform an approved
physical device delivery test; then release the intended small batches. Turning
the database flag on alone never sends anything. Turn it off after the run.

## Verification boundaries

Pure tests validate encryption/VAPID request construction without network,
default-locked gate, explicit recipients, SSRF/open-redirect prevention and
simulated service-worker display/click receipts. Browser permission, actual
provider acceptance and physical device delivery must be verified separately
after the user authorizes an actual test notification. No real push was sent
during preparation.

## Review-fix verification — 2026-11-03

- Design check, `tsc --noEmit`, lint (0 errors, 26 existing warnings), all
  953 tests and the production build passed using CI placeholder credentials.
- Regression tests cover an externally removed subscription during TURN OFF,
  server-first opt-out failures, worker verification before consent, waiting and
  installing workers, activation failure/timeouts, 5+1 device pages for one user,
  malformed cursors, per-page auth/send locks and mocked-send deduplication.
- Local Chromium verification used the real legacy v2 and updated service-worker
  scripts, with permission, subscription and API data mocked. Activation and
  capability confirmation completed before subscription storage; a stale TURN
  OFF did not create another subscription. Preview continuation and edit/reset
  behavior passed at 390×844 and 1440×900 without overflow or browser errors.
- A read-only MC Home check found no config row (first initialization remains
  false), no subscriptions and no delivery records. No schema/config writes,
  real permission requests, real browser subscriptions or provider sends were
  performed. Physical Android delivery remains deferred until authorized.
