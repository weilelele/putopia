# Device scene QA — 2026-09-18

final result: passed

## Reference and capture
- Source: /Users/will/.codex/generated_images/01a0a662-6489-7960-97b3-5d18666ca72b/exec-b5c24bbc-3ece-41bd-a845-9021858b3545.png, plus latest user overrides (two-line title, new sentence, remove Archive).
- Mobile: /tmp/scene-mobile-final.png; modal: /tmp/scene-modal-final.png; desktop: /tmp/scene-desktop.png.
- Viewports: 390×844 and 1280×900. Browser capture at CSS pixel density. Two-state source was split and normalized to 390×844 for comparison (/tmp/scene-comparison.png); generated reference proportions are approximate.
- States: default/automatic world playback, centered function dialog, focus return, batch switch.

## Findings and comparison history
- Initial P2: a global image max-width rule limited the overscanned world image and left a crescent at the screen edge. Fixed with explicit max-width:none; desktop close visual inspection confirms full aperture coverage.
- No remaining actionable P0/P1/P2 findings.
- Typography: Courier Prime and shared type tokens; title explicitly breaks after Multiverse; supplied sentence exact. Function labels and statuses readable on mobile.
- Layout: compact 16:9 real environment photo, existing page gutters, centered dialog with page visible around it. Current batch section deliberately preserved as requested, including explanatory copy and original media/navigation.
- Colors: existing deep navy, orange and off-white tokens. Modal matched selected dark design; functional status icons distinguish categories without relying on color alone.
- Imagery: generated workshop photo follows selected warm archive scene and original hardware. Fixed scene with measured elliptical aperture; original Kyoto library, meadow and night frames. World content changes, housing does not. Snow is procedural signal noise, not a replacement illustration.
- Copy: exact user sentence, two-line title, no Archive action, Explore the function. Function grouping uses backend status, not hardcoded availability.
- Focused comparison: popup typography, group separation, close affordance and aperture edges inspected in browser screenshots. Full-view comparison confirms compact visual hierarchy; latest title/copy and unchanged batch content intentionally differ from generated mock.

## Interaction validation
- Function modal opens, Escape closes, focus returns to trigger. Native dialog provides focus containment/background inertness.
- Mobile has no horizontal overflow. Batch navigation still changes Kyoto/Kamakura data.
- Automatic snow/world transitions observed; effect cleans timers, pauses for hidden/offscreen/modal states and honors reduced-motion preference (code reviewed).
- Browser console error query returned no errors during checked interactions.
- Design check, TypeScript, lint, tests and production build checked separately before release.

## Follow-up polish
- Generated still is a design visualization, not a photograph of a delivered unit.
- Reduced-motion setting was reviewed in code; not toggled through OS during this session.

## Device public entry release · 2026-09-25

Complete device photographs automatically cycle every 6 seconds without controls, preserving all three displays. Image configuration lives in src/lib/console-hero.ts. Mobile 390×844 browser checks confirmed automatic image changes, unchanged scroll position when switching locations and using browser back, and guest access to Intel, Worlds and Voyagers. Classified content and write actions retain authorization. World archive fill-image layout was fixed. See docs/audits/guest-access-2026-09-25.md for remaining guest restrictions.

## Voyager feed prototype — 2026-10-12

Latest scoped report: [Voyager feed QA](docs/design/voyager-feed-prototype/design-qa.md).
Source: first user-selected Voyager concept. Mobile 390×844, narrow/short 320px and desktop verified in the in-app browser. Author/role interactions and draft protection checked with local sample data. Combined visual evidence and explicit production boundaries are recorded in the linked report.

final result: passed

## Voyager feed prototype v2 — 2026-10-13

Latest scoped report: [Voyager feed v2 QA](docs/design/voyager-feed-prototype/design-qa.md). Current code has compact 15/20 feed typography, post-detail navigation, floating POST, Applicant permission dialog and a guest/unregistered feed gate. ESLint, TypeScript, 10 permission tests and design checks passed. Browser security policy blocked preview inspection; previous screenshots apply only to v1. Current rendered verification remains pending.

final result: blocked

## Voyager feed v2 mobile follow-up — 2026-10-13

Browser access restored. Requested mobile prototype flows verified at 390×844 and 320×540; fixed return focus and floating POST overlapping REPLY. See the [updated scoped report](docs/design/voyager-feed-prototype/design-qa.md) and v2 screenshots. Core local flows passed; real-phone keyboard acceptance and cross-route history caveat are documented.

## Voyagers production integration — 2026-10-13

Formal Feed, Members and Logs integration is implemented. [Release QA](docs/design/voyager-feed-release/design-qa.md) distinguishes passed UI/isolated SQL checks from pending live activation. Full build, TypeScript, 621 tests and 24 isolated SQL assertions pass. The v97 migration has not been applied to the shared production database; live Feed verification remains blocked until that step. No deployment performed.

final result: blocked (live Feed activation only)

## Dashboard initiation entry — 2026-10-27

Latest scoped report: [Dashboard identity card QA](docs/design/dashboard-initiation-20261027/design-qa.md). Selected orange-entry reference, original role/product copy, and equal 20° diagonal joins are implemented in the shared homepage component. Browser checks used local Applicant fixture data at 390×844, 320×844 and desktop 1440×1000. Initial narrow-label wrapping and desktop narrow-container issues were fixed and recaptured. The scoped report contains the combined reference/render comparison, typography/spacing/color/assets/copy checks, interaction evidence, and validation limits. Design checks, TypeScript, lint (0 errors), 826 tests and final production build passed. No deployment or production data changes.

final result: passed
