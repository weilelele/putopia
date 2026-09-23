# Device Batch admin field usage audit

Date: 2026-09-23

## Scope and evidence limit

The production admin route redirected to `/login`, and the local admin route did the same, so the authenticated editor could not be captured in this audit run. Blocker evidence: `/Users/will/Sites/putopia/docs/audits/device-batch-admin-login-blocked.jpg`. This is therefore a static consumer audit of the editor, published Batch shape, public Devices surfaces, claim flow, owned-console records, dashboard/newsletter feeds, and notification actions. It is not a screenshot-based UX audit of the authenticated admin screen.

## Confirmed changes after owner review

The owner clarified that TIME ZONE and FIELD LEAD LATEST NOTE are intended functionality, not obsolete fields. Both are retained and their missing public consumers have been implemented. No database records were changed during verification.

| Admin field | Stored property | Current consumers | Recommendation |
| --- | --- | --- | --- |
| TIME ZONE | `timeZone` | Live now displays a ticking local clock using the configured Batch time zone. | Retained; the embed's own clock is disabled when the Batch clock is shown. |
| HERO CAPTION | `heroCaption` | No runtime consumer. Gallery and Material Records use captions from published Update media. | Removed from editor, validation and draft model; stripped on save. Legacy records remain readable. |
| FIELD LEAD LATEST NOTE | `lead.latestNote` | Clicking the Field Lead avatar/name now opens biography and latest note together. | Retained. Public member profiles supply avatar/bio, with unique exact-name fallback for legacy unbound leads. |

## Redundant control that can be simplified

| Admin field | Why it looks removable | Current constraint | Recommendation |
| --- | --- | --- | --- |
| CLAIMED UNITS | Persisted batches disable the input, and completed orders are authoritative. The same value is already shown in the inventory summary. | `inventory.claimedQuantity` is still used to calculate availability. | Remove the disabled form input for persisted batches; retain the read-only summary and database value. |
| LAST UPDATED | It is operational metadata rather than authored content. | `updatedAt` still sorts and timestamps Dashboard, Signal feed, and newsletter Device entries. | Remove manual editing only after publish/save assigns the timestamp automatically. Do not delete the property yet. |

## Fields that are still active and should not be deleted

- BATCH NAME, BATCH CODE, LOCATION, BATCH STATUS, PUBLIC SUMMARY.
- FINAL COMPLETION: used on Claim and My Consoles.
- CURRENT STATUS LINE: used in the Claim field report and claim narrative.
- NEXT MILESTONE: used on the public Batch detail and admin preview; Kyoto currently has a code override that should be removed separately if admin is to remain authoritative.
- PRIMARY IMAGE URL, IMAGE FIT, PRIMARY IMAGE ALT TEXT: used by followed-batch cards, Claim, My Consoles, dashboard fallback imagery, and accessibility text.
- FIELD LEAD: used on Batch detail and Claim.
- CAMERA SOURCE, LIVE NAME, COSMO CHANNEL ID, COSMO BAND ID, FRAME FIT: all used to construct the live camera item and embed URL.
- LISTING QUANTITY, BATCH PRICE, CURRENCY, WHAT THE CLAIM INCLUDES: used by inventory/checkout and the Claim page.
- PACK NAME, DELIVERY WINDOW, SUMMARY, CONTENTS, PACK MEDIA: used by the package drawer, Claim, owned-console fallback, and holder email.
- Update DATE, TITLE, TEXT, MEDIA URL, CAPTION, IMAGE DESCRIPTION, VIDEO COVER: used by Updates, Material Records/gallery, Dashboard updates, follower email, and accessibility output.

## Stored legacy properties outside the current editor

The current runtime has no consumer for `facts`, `availability`, or `archiveStages`. `heroMedia` is also unused and is forcibly cleared on save. These are data-shape cleanup candidates, but they are not contributing controls in the current admin interface.

## Implemented simplifications

1. Removed HERO CAPTION only; retained TIME ZONE and FIELD LEAD LATEST NOTE.
2. Removed the redundant CLAIMED UNITS input; retained read-only summary and inventory data.
3. Removed manual LAST UPDATED input. Publishing assigns the server timestamp; saving an existing draft preserves its prior timestamp.
4. All other fields remain unchanged. Local Live playback still cannot be verified because the external embed's frame-ancestors policy excludes localhost.
