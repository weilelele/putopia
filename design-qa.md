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
