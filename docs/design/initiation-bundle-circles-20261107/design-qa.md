# Initiation bundle cards — isolated PR verification

final result: passed

## Scope

The selected bundle card expands its original-asset benefit photographs: Initial $38 has Pack 1, Pack 2, Mission, Membership in one row; Complete $488 has Pack 1–3 above Pack 4, Mission, Membership. Only the selected card expands. The most recent user correction is included: inactive Initial says **Packs 1–2** and retains the $460 upgrade note, without “Console not included.”

Shared membership / remote Array access, payment authorization, shipping and aftercare appear once around the selector. Continue uses the existing selected price and handler. Native radios, descriptions, focus indicators and disabled fieldset are retained.

This branch starts at main `dbc93f851281db88107664388613da256cd14f23`. It contains only five UI/fixture source files and this scoped evidence. It does not include any commits or other working changes from codex/initiation-pack-progress. In particular, main's checkout request service, error focus, briefing navigation, updated upper chapters and grouped FAQ remain intact. No API, pricing, inventory, permissions, schema, email or automation files change. No migration applies.

Main now uses a different Antenna image in its upper product content. The new bundle circle explicitly uses the user's selected antenna-still-life-v1.jpg and its measured crop; the upper content is unchanged.

## Reference and density

- Visual truth: [selected v5](reference-v5.png), with the later user correction removing the Initial exclusion phrase.
- Source: 978×1609 pixels, two 489×1609 artboards. Each is cropped and normalized to 390×1283 without changing its aspect ratio.
- Browser: CUA / Chrome, local worktree server on 127.0.0.1:4196. Screenshots are JPEG, one output pixel per CSS pixel.
- Mobile: 390×844; narrow: 320×844; desktop fixture: 1440×1000. Large text keeps the 390×844 viewport and sets root text to 32px (200%).
- Full comparisons: [Initial](comparison-initial.jpg), [Complete](comparison-complete.jpg), plus [controls after scrolling](mobile-controls.jpg).
- Focused comparison: [both selected cards](comparison-cards.jpg). Source and actual card regions are compared at 352px width; inspect source asset subjects, circle edges, order, typography, labels and prices together.
- Browser geometry and state evidence: [browser-evidence.json](browser-evidence.json).

## Fidelity surfaces

| Surface | Result and intentional differences |
| --- | --- |
| Typography | Courier Prime 400/700 and existing tokens. Heading 32px, names 16px, prices 24px, benefit captions 13px/700; auxiliary copy remains at least 12px. Names/prices reflow at large text; no ellipsis or font reduction. Real type tokens and shared CTA typography take precedence over generated lettering. |
| Layout / spacing | Four columns for Initial; three columns / two rows for Complete. Circles remain inside their selected outline. Only the selected card contains images; no extra click or separate benefit panel. Main's current page chapters and spacing outside checkout are unchanged. Actual 844px-height views scroll, unlike the taller reference artboards. |
| Colors / tokens | Existing orange, deep blue and off-white; flat surfaces, a visible selected outline, native radio, existing shared CTA and navigation. No generated glow, gradient, texture, shadows or mock-specific color drift is introduced. |
| Imagery | Badge and welcome-letter folio use different crops of pack-email.png. Pack 2 shows the brass Antenna study and its outline, not only texture; neighboring design studies in the original are not a quantity or color-choice promise. Console uses the current carousel warehouse photograph, with original hardware/logo. Pack 4 retains the envelope and table without revealing its contents. Mission uses the current phone image. All four / six images loaded. |
| Content | Exact Mission singular, physical packs first, two shared digital entitlements last. Selected cards have no boundary / add-on prose. Inactive Initial has Packs 1–2 plus $460 add-on note; inactive Complete keeps Packs 1–4 · Console included. Shared transaction and delivery copy appears once. Latest user deletion intentionally differs from v5. |

The fixture's existing preview-state notice can be visible at the top of scrolled screenshots. It is a development-only surface and is not part of the production design. Focused comparisons isolate the actual selector. The generated reference's large empty lower area, synthetic product details, type sizing and overly bright orange are not copied over the authoritative design system and original assets.

## Interaction / responsive evidence

- 390px: [Initial](mobile-initial.jpg), [Complete](mobile-complete.jpg). Switching via native ArrowDown changes the selected radio, four/six images and Continue amount; selecting a card creates no dialog or checkout.
- 320px: [Initial](narrow-initial.jpg), [Complete](narrow-complete.jpg). Both states stay within the viewport; long package names and Membership wrap naturally.
- 200% text: [Initial](large-initial.jpg), [Complete](large-complete.jpg). No horizontal overflow. Price may move to its own line.
- Focus / footer: [Continue](large-continue.jpg) and [aftercare](large-aftercare.jpg). The aftercare focus rect is y=383..461, above the fixed nav beginning at y=731. Page scroll-padding preserves focused controls above navigation.
- Desktop: [Initial](desktop-initial.jpg), [Complete](desktop-complete.jpg); 560px checkout column and full four/six-image structure.
- Existing fixture checkout returns “Fixture only. No payment session has been created.” through main's original startCheckout service injection; no server payment request is issued.
- Legacy Initial still presents UPGRADE · $460. Paid and granted fixtures have zero purchase radios. Granted copy still excludes paid deliveries / Console claim. Sold-out Continue is disabled.
- Browser console errors: none. Busy/inFlight safeguards and existing checkout response/error handling are unchanged in the diff.

## Comparison history

Earlier local iteration corrected Next Image fill/width incompatibility, large-text title wrapping, Complete circle proportions and footer focus. Isolation onto main preserves those fixes. During isolation, main's changed ANTENNA.image alias was identified and the circle was pinned to the approved original asset before final screenshots/build. No actionable P0/P1/P2 issues remain in this scoped UI.

## Checks on the isolated branch

- npm run design:check -- --base origin/main: passed.
- npx tsc --noEmit: passed.
- npm run lint: passed, 0 errors / 26 existing warnings.
- npm test: 109 files / 946 tests passed.
- npm run build: passed (webpack).
- git diff --check: passed.

Dependencies were installed from the lockfile. The isolated worktree uses the same placeholder configuration as CI, without copying the original checkout's environment files or service credentials. Unit tests are pure; browser checkout actions used injected local fixtures only. No purchase, account creation, claim, vote, submission, database write or production deployment was performed. Real-device / assistive-technology and real-payment acceptance are outside these checks.

## Implementation checklist

- [x] Selected card expansion, fixed order and approved original-image crops.
- [x] Latest Initial copy deletion and shared transaction / delivery copy.
- [x] Native keyboard selection, 390px / 320px / 200% / desktop checks.
- [x] Original main checkout contracts and unrelated source checkout preserved.
- [x] Five repository gates and full / focused screenshot comparisons.
