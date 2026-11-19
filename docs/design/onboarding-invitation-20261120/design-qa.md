# Onboarding invitation reveal — 2026-11-20

**Findings**

- No remaining actionable P0/P1/P2 findings.
- Initial P2: at 320×568 the fixed title size wrapped into three lines and the primary action fell below the viewport. A responsive 28–32px heading and short-screen spacing keep the two-line title and all actions visible. Verified primary bottom 426px, Gmail bottom 519px, Change bottom 544px, with no horizontal overflow.
- Follow-up P2: shortening the layout placed supporting copy and email over bright paper/badge areas. Short screens now use flat deep-blue copy/action surfaces. [Post-fix evidence](narrow-final.png) confirms legibility and visible controls. The full-photo composition remains unchanged at 390×844.
- Expected differences from the generated mock: shared 16px/400 action typography, brand orange tokens, flat shared buttons, minimum 44px targets, and native editable copy take precedence over the raster mock's bold button and smaller Change link. The main action is approximately 18px higher; classified as acceptable P3 spacing variation.

**Comparison evidence**

- Source visual truth: [approved reference](approved-reference.jpg), originally `output/onboarding-success-concepts/20261120/integrated-invitation-v1.png`, 852×1846 pixels.
- Implementation: [mobile screenshot](mobile-final.png), 390×844 pixels at a 390×844 CSS viewport, 1× screenshot density, local production build at `/dev/onboarding-success?variant=test&presentation=1`.
- [Combined full-view comparison](comparison.jpg): source normalized to 390×844 next to the equal-size rendered implementation, 780×844 total.
- [Focused footer comparison](footer-comparison.jpg): actual source and implementation bottom 200px together, confirming action hierarchy, activation wording and mailbox entry.
- [Entrance filmstrip](entrance-filmstrip.jpg): browser-captured frames show black, a center light point, then the expanding photographic aperture. Final copy and actions were observed after their delayed reveals.
- [Desktop](desktop-final.png): 1280×900 CSS viewport, centered 480px portrait composition with deep-blue surrounding space. [Short phone](narrow-final.png): 320×568.
- State: unauthenticated QA fixture, `voyager@gmail.com`, test variant, completed reveal. No production submission, enrollment or payment.

**Required fidelity surfaces**

- Typography: existing Courier Prime 400/700; two-line orange title; body 16px; metadata minimum 12px; shared button typography. Responsive title corrected after the initial narrow-screen comparison.
- Spacing/layout: photo and physical objects retain selected composition; full-width primary above compact horizontal mailbox group at the primary viewport. Short-screen contrast adaptation is intentional. Desktop enhances the portrait layout.
- Colors/tokens: existing orange, off-white and deep-blue tokens. Black is limited to the user-requested entrance. No decorative glow, blur, gradients, shadows or HUD were added to UI.
- Image fidelity: generated photographic background preserves invitation print, badge engraving, wood and lighting; app text/buttons are native UI. The original asset references, prompt and output are in [provenance](asset-provenance.json). No hardware image or logo was replaced by CSS/SVG approximations.
- Copy: exact title “Your initiation starts here.”, supporting “Meet the Collective. See what comes next.”, “START INITIATION”, and “Activation email sent to”. Real email/provider selection remains dynamic.

**Primary interactions and reliability**

- Start Initiation navigates to the isolated guest Briefing fixture. Briefing opens and exposes its own music control; the invitation has no audio/video/sound hook.
- Change opens the local email form and Confirm email remounts the invitation. No email is sent by this fixture.
- Gmail target remains `https://mail.google.com/mail/`, opening in a separate tab. Existing provider mapping preserved.
- Replay entrance remounts and replays; current/control fixture retains inbox-first guidance.
- Fresh B production wiring retains the same click event and `/voyager-initiation?briefing=1` destination. Restored pending-email visits retain control presentation; assignment logic unchanged.
- Image load/error and timeout fallback reviewed in code: slow image skips the reveal after 1200ms; opening has a 2200ms safety timeout. Escape can skip the entrance once focus is within it. Reduced motion makes all content immediately visible via CSS. OS reduced-motion setting and forced image failure were not toggled during browser verification.
- Browser error log query returned no errors for the final production-built fixture.

**Implementation checklist**

- [x] Selected art, native controls and silent one-shot reveal implemented.
- [x] Primary viewport, narrow/short viewport and desktop checked.
- [x] Combined source/render comparison and focused footer review completed after fixes.
- [x] `design:check`, TypeScript, lint (0 errors; 26 existing warnings), 124 test files / 1101 tests, production build passed.
- [x] Local production-built preview left running with placeholder service credentials.
- [ ] Merge/release is outside this preview handoff. If released, record a new B-presentation rollout boundary before combining experiment cohorts. No experiment configuration or daily automation was changed.

**Follow-up polish**

- Real-device Safari acceptance and OS reduced-motion behavior remain device-level checks; no known blocking issue.

final result: passed
