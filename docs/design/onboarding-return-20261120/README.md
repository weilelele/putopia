# Returning onboarding visitors · 2026-11-20

User requirement: only the immediate successful email-submission screen uses
the assigned experiment UI. Later registration visits use the original
inbox-first screen, including browsers assigned to test. Keep the assignment
for price and paid-purchase attribution.

Implementation removes flag evaluation from pending-email restoration and
restores the inbox UI on a persisted browser pageshow. Auth changes no longer
re-run this restoration effect during the fresh success screen. Fresh
submission still evaluates the same 50/50 device flag after email success.

The development/preview fixture at `/dev/onboarding-success?variant=test`
has a Test returning visit action. It saves a local pending email and test
assignment, then opens the real `/new?qa=1` route. No application, email or
payment is created. The fixture remains unavailable in production.

Local browser verification used placeholder service credentials. At 390×844:

- Test fixture retained the approved Start Initiation UI.
- Restoring the saved test browser opened Check your inbox, without Start Initiation.
- Reload retained the original inbox UI.
- Explore before activating opened Dashboard. CREATE ACCOUNT returned to
  `/new?step=cta` and displayed the inbox UI.
- Browser back/forward retained the inbox screen. The handler also explicitly
  resets presentation for persisted pageshow; no synthetic event was injected.

Screenshot: `returning-390.jpg`. Layout and component typography are unchanged.
Dashboard data failures in this local run are expected from placeholder service
credentials; no production business data was contacted.

Validation: design guidance, TypeScript, full ESLint (0 errors; 26 existing
warnings), all 1,101 pure tests, and production build passed. No schema or
database migration is required or applied. React review: one cleaned-up
pageshow subscription, stable hydration dependencies, no returning flag
request, no SDK initialization or new server action.
