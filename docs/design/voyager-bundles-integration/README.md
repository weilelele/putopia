# Integrated bundle purchase UI verification

Reference: the approved mock discussed on October 18–20, and the existing benefits-first `/voyager-initiation`. The preceding four Packs, Mission Board, Intel and participation remain in their original order. Purchase differences appear only in the final checkout area. No removed hero note, fourth-delivery footer sentence or mock-payment notice is added to the real page.

The original Initiation layout, Courier Prime, photos/carousel, ArchiveButton and calibration dialog remain. The purchase selector uses only existing deep-blue/orange/off-white tokens: 16px option padding, 12px gap, 16px labels/content, 12px notes and thin borders. Pointer selection adds one orange border; keyboard-visible focus retains a separate outline. Existing checkout authorization/shipping/calibration copy remains because the real payment flow still requires it.

Verified with the real Initiation component and development-only fixtures using dummy loopback service settings:

- 390×844: selecting Initial/Complete changes the selected radio and button to $48/$520. `document.scrollWidth === innerWidth === 390`. A test CTA returns the explicit fixture-only refusal, with no API payment session.
- 320×844: labels wrap naturally; `document.scrollWidth === innerWidth === 320`. See `phone-320.png`.
- 1280×900: purchase controls remain centered in the existing reading layout; no horizontal overflow. See `desktop.png`.
- Paid Initial fixture displays $500, includes the first-two ownership badges, and its test CTA cannot pay.
- Historical Initial fixture retains crossed-out $520 / actual $400 and the original continuation CTA.
- Feature-off calibrated fixture has no bundle radio controls and retains the original `INITIATE` CTA.
- Browser viewport override was reset after verification. Screenshot files were reopened and inspected before committing.

Screenshots: `phone-390.png`, `phone-320.png`, `desktop.png`. These contain only local synthetic fixture data. The 390px screenshot shows the purchase selector and beginning of its existing checkout flow; the primary CTA is reachable by normal vertical scrolling. No production payment or claim was exercised.

Differences from the earlier standalone mock: Complete remains the default to preserve the existing $520 entry path. Real calibration, authorization and delivery-region notices remain instead of the mock confirmation dialog. Live Stripe E2E and a real-phone branch-preview review remain release checks; screenshot QA does not establish full accessibility conformance.
