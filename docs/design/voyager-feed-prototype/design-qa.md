# Voyager feed prototype v2 mobile QA — 2026-10-13

Result: requested in-prototype mobile flows passed after two fixes. Real-phone keyboard testing and cross-route return caveat remain below.

## Environment and evidence

Codex in-app browser, localhost:3012/dev/voyager-feed. Viewports: 390×844 and 320×540. Existing preview tab was accessible this session; the earlier browser access blocker is resolved. All post/reply edits were local React demo state. Sample data restored after testing; no production content was posted.

Screenshots: `feed-mobile-v2.jpg`, `compose-mobile-v2.jpg`, `detail-mobile-v2.jpg`, `permission-mobile-v2.jpg`, `permission-320-v2.jpg`, `guest-mobile-v2.jpg`. Earlier unsuffixed screenshots and comparison.png remain v1 evidence only. `x-mobile-reference-v2.jpg` remains the density reference.

## Verified interactions

- Voyager text post: empty submit disabled, published post appears first, success notice shown.
- Architect image post: local PNG chooser, preview, publication and image in detail all verified. Draft-close confirmation offers Keep editing and Discard changes; Keep editing preserves text.
- Post text and reply-count links enter the second-level detail. In-app Back and browser Back restore the feed. Measured browser-Back scroll restoration: 537.5px → 537.5px.
- Reply draft survives going to feed and reentering detail; role switch is disabled while a draft exists. Reply submission clears the editor and updates the count. 500-character input limit is present.
- Author can edit/save/delete their post and reply. Deletion confirmation appears and deletion updates the visible content/count.
- Applicant can like (8 → 9) and reply. POST opens the permission dialog, with no composer. Text explains becoming a Voyager; Voyager Initiation navigates successfully to /voyager-initiation.
- Applicant and Architect see only the author-ownership explanation/report action on someone else's post, no Edit/Delete.
- Guest and unregistered have zero post articles and post images in the DOM. Guest browser-Back to #post=shore still shows the gate only. Request Access links are /new and /register respectively; Log In preserves /voyagers redirect.
- At 320×540 the permission dialog stays within the viewport, its body scrolls, footer CTA remains reachable, and Tab wraps from CTA to Close. Narrow-screen reply can be submitted with no horizontal overflow.
- Reset restores fixture data. Browser console: no warnings/errors in captured logs.

## Fixed and rechecked

1. Returning from detail previously focused a detached anchor. Store its accessible label and resolve the newly mounted feed anchor; verified the original post link regains focus. Role changes also clear stale return state and reset scrolling.
2. Floating POST overlapped the right-aligned REPLY control. Reply controls now align left, wrap, and reserve 112px on the right. Verified at 390px and 320px, including successful narrow-screen reply submission.

## Visual review

Feed retains Courier Prime, 15px/20px body, 12px metadata, 40px avatar and 8px content gap, compact separators, original media, and flat navy/orange/off-white surfaces. There is no top composer strip. Detail expands media across the column and uses 16px/24px text. Permission uses the shared centered ArchiveSheet, not a bottom sheet. Guest uses the Dashboard's original wordmark/symbol and centered calls to action. 390px screenshots confirm legible wrapping; 320px has no horizontal overflow.

## Checks and limitations

Scoped ESLint, TypeScript, 10 pure model tests and design:check passed. CSS fix also checked after final edits. Full repository build/test suite not run; no push or deploy performed.

- Browser viewport testing does not simulate a real iOS/Android virtual keyboard or safe-area hardware; these remain real-device acceptance items.
- Initiation destination loads correctly. Returning from that separate Next.js page briefly left the old rendered page at the prototype URL; a reload restored the prototype. Cross-route history restoration remains an integration caveat, distinct from the verified in-prototype feed/detail Back flow.
- No payment, registration, or real-account mutation was performed. This is a frontend prototype; server-side registration filtering and ownership enforcement are still required for production.
