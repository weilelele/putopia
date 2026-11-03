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
