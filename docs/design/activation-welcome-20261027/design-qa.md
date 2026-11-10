# Activation welcome · 2026-10-27

final result: passed

## Visual truth and evidence

Source: the selected moving-light prototype, including the final instruction moving the welcome-pack boundary right by 30% to 60.45%. `reference-mobile.png` is the actual 390×844 prototype capture at frame 8020ms. The user's later destination clarification replaces the temporary `/initiation/new` idea with the existing Initiation onboarding briefing.

Implementation: the production `ActivationWelcome` component, rendered via the read-only `/dev/activation-welcome?frame=8020` fixture. `implementation-mobile.png` is 390×844, `implementation-narrow.png` is 320×740, `implementation-desktop.png` is 1280×900. All are browser-rendered CSS pixels at 1× density. `comparison.jpg` combines the source and implementation at identical mobile size/state, opened and reviewed together. No density conversion was needed. Focused image/cut and text/button regions are readable at native size and were compared in that same input.

## Findings and fixes

- Initial P2 desktop issue: grid stretching made both buttons about 100px high instead of the source's 52px. Fixed with `align-self: start` on the action group. Refreshed browser measurements show both buttons exactly 52px; the saved desktop capture is after this fix.
- The Next.js development indicator is tooling chrome, not product UI; it is absent from deployed builds and excluded from fidelity findings.
- No remaining actionable P0/P1/P2 differences. WebP compression is an accepted delivery optimization; the source geometry and device family are preserved.

## Required fidelity surfaces

- **Typography:** existing Courier Prime 400/700; 32px phone title and 48px desktop title, 16px body/actions, 13px status. Browser-computed narrow-screen text sizes were checked; none below 12px. Exact approved copy retained.
- **Spacing/layout:** 16px portrait gutters, top/bottom safe-area padding with a 24px minimum, square-derived compact image height, 60.45% welcome-pack width and proportionally compressed diagonal cuts. Photo row touches the Console directly without a matte band. Mobile document fits 390×844; 320px has no horizontal overflow and retains 52px actions. Desktop uses the approved two-column enhancement.
- **Colors/tokens:** canonical deep-space blue, orange and off-white; flat UI surfaces; single top-right notch on the primary button only. The photograph-only soft mask is the user-authorized effect. Copy/actions never dim.
- **Images:** four real source/approved generated variants, optimized to WebP, total 545986 bytes. Original public assets preserved. Console zoom 1.06, letter/badge close crop, smaller Antenna and especially smaller sealed envelope. Native photo geometry and coherent background retained. All four assets loaded in browser.
- **Copy/content:** no removed captions or Pause control. Account activated does not assert Voyager membership. Antenna concept and unrevealed-delivery provenance remains internal. Both image and primary button target `/voyager-initiation?briefing=1`; secondary targets `/console`.

## Flow and technical verification

- Browser navigation to `/register/complete` without a session ended at `/login?redirect=%2Fregister%2Fcomplete`, with no success state exposed. The server verifies `getUser()` and the user's `registered_at` before rendering. A profile-read error is retryable rather than treated as unregistered.
- Both legacy and signed-link registration paths converge on the existing full-page navigation, now using the pure landing policy. Tests cover default welcome, external/loop rejection, remembered fallback, and preserving explicit paid/calibration/device/participation return paths.
- Light tests cover the 4s Console hold, shorter other holds, 1.1s transitions, descending radii and continuous radius at all boundaries and loop wrap. Canvas setup/cleanup, hidden/offscreen suspension, and OS reduced-motion static rendering were code-reviewed. OS motion override was not available in the chosen browser API; it was not toggled through system settings.
- The actual onboarding query is already handled by `briefingLinkOpens`, including revisiting after a browser has recorded prior viewing. Existing paid-member audience rules remain intact. No account was created, no password changed, and no checkout/profile/order mutations were performed for verification.
- Local page checks used placeholder service configuration and localhost (analytics disabled by the existing hostname guard). Earlier navigation through 127.0.0.1 generated a missing-placeholder PostHog warning; this is local configuration history, not a new component error. The localhost checks showed no new component/runtime or image errors.
- TypeScript, ESLint (existing warnings only), 104 test files / 888 tests after rebasing the latest checkout optimization, design gate and production build passed. Hosted check results are recorded in the PR.

## Route contract

`/register/complete`: registered-account task completion, no owner tab/global navigation, Dashboard fallback, noindex. `/dev/activation-welcome`: development/branch-preview read-only fixture; production 404. No schema migration or environment-variable changes are required.
