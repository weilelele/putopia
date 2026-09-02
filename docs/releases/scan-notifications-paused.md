# Legacy Scan notifications paused

Legacy Scan cannot currently deliver its promised experience during the product
redesign. Its failure ("The scan came back empty") and success ("Your world really
exists") notifications are paused through `SCAN_NOTIFICATIONS_ENABLED = false`
in `src/lib/signal/scan-notification-policy.ts`.

## Scope

- Both email and App push notifications are suppressed.
- World-page resolution and both cron resolution entry points return without
  querying or claiming scan outcomes.
- Direct sender calls are also guarded, including the legacy publish-time
  success notification.
- No schema changes, data deletion, or notification timestamp updates are needed.
- Other transactional emails, Signal publishing, and Dreamcatcher queue processing
  remain unchanged. Existing Scan UI is not redesigned by this patch.

## Deployment and verification

The pause takes effect only after this code reaches the production deployment.
Do not disable the shared email provider or the entire cron routes: they also
support unrelated workflows. Do not invoke production crons just to test the
pause, because their other work still writes to shared production services.

`src/lib/signal/scan-notification-policy.test.ts` covers page/cron resolution and
both direct senders with all external-service boundaries mocked to throw.

## Before resuming

Require explicit product approval and decide how to handle old unresolved scans
before re-enabling the switch. The pause preserves `scan_resolved_at` and
`confirm_email_sent_at`; re-enabling without a backlog policy could send stale
notifications. Replace the old copy and Scan behavior as part of that review.
