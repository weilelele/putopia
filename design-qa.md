# Live Observation Rooms — Design QA

## Comparison setup

- Source visual truth:
  - `public/assets/concepts/device-kyoto-live-room.png` — 853 × 1844 px.
  - `public/assets/concepts/worlds-dream-catcher-live-room.png` — 853 × 1844 px.
- Browser-rendered implementation:
  - `design-qa-device-mobile.png` — Device default/top state.
  - `design-qa-device-sheet-mobile.png` — Device all-batches sheet.
  - `design-qa-device-info-mobile.png` — Device Info progress and material rows.
  - `design-qa-device-pack-mobile.png` — Device shipment expanded state and emphasized Claim action.
  - `design-qa-device-materials-mobile.png` — Device simplified material rows.
  - `design-qa-worlds-mobile.png` — Worlds default/top state.
  - `design-qa-worlds-queue-mobile.png` — Worlds queue state.
  - `design-qa-worlds-queue-detail-mobile.png` — Queue record detail sheet.
  - `design-qa-worlds-voting-mobile.png` — Earlier text-choice voting iteration.
  - `design-qa-worlds-dispatch-list-mobile.png` — Signal Dispatch list using three current published tasks and their real candidate media.
  - `design-qa-worlds-dispatch-detail-mobile.png` — Signal Dispatch detail with four returned video candidates and a selected signal.
- CSS viewport: 390 × 844 px; normalized browser capture at 390 × 844 px.
- Implementation captures: 390 × 844 px.
- Density normalization: the 853 px-wide source images were treated as full-page art-direction references and compared at an equivalent 390 px portrait width. Their full-page height represents a scrollable composition rather than one 844 px viewport.
- Theme/state: dark Style A, Kyoto selected. Device defaults to Info; Worlds defaults to Queue. The Device sheet was also compared in its open state.

## Findings

No actionable P0, P1, or P2 issues remain.

- Typography: Courier Prime is used throughout with the repository's 12 px minimum type floor. The hierarchy, uppercase labels, tracking, and restrained weights match the reference direction without reproducing illegibly small mockup text.
- Spacing and layout: both pages use a single portrait column, 44 px minimum controls, horizontal object tabs, clipped top-right frames, and a fixed repository bottom navigation. Content continues below the viewport without horizontal overflow.
- Colors and tokens: all structural colors use the canonical deep blue, off-white, nucleus orange, status green/warn/red, and approved border tokens. No gradients, glow, glass treatment, or grey surface system was introduced.
- Image quality: dedicated high-resolution camera stills were generated for the Device and Dreamcatcher feeds. They preserve the reference's subject, crop, quiet surveillance mood, and warm workshop lighting without baking UI into the images.
- Copy/content: the implementation reflects the newer product specification where it intentionally differs from the earlier mockups: Device defaults to Info, the live metadata is overlaid on the camera feed, the compact Claim block emphasizes 32 total / 18 remaining, each shipment exposes a concise explanation, and material records omit redundant type/duration labels. Worlds uses one submission entry point, separates Queue / Signal Dispatch / Live Chat, and makes the returned media visible before a user chooses one signal.

## Focused-region evidence

- `design-qa-device-info-mobile.png` verifies the four-stage progress, facts, and vertically stacked single-video/single-image/image-set rows.
- `design-qa-worlds-mobile.png` verifies the compact capacity panel and single submission CTA; the current three-way Queue / Signal Dispatch / Live Chat navigation is verified in `design-qa-worlds-dispatch-list-mobile.png`.
- `design-qa-device-pack-mobile.png` verifies the portrait accordion rhythm, expanded Pack explanation, state labeling, and the full-width high-contrast Claim action.
- `design-qa-device-materials-mobile.png` verifies that rows retain visual media cues while removing `IMAGE`, `IMAGE SET`, category, and duration copy.
- `design-qa-worlds-queue-detail-mobile.png` verifies readable queue-record details and dimmed page context.
- `design-qa-worlds-dispatch-list-mobile.png` verifies the compact 2 × 2 media mosaics, three real task examples, response counts, and portrait list density.
- `design-qa-worlds-dispatch-detail-mobile.png` verifies four actual video candidates, poster fidelity, selected-signal state, and a clear confirmation action. A separate crop was unnecessary because all labels, media, and selection affordances remain legible in the 390 × 844 full-view capture.
- `design-qa-device-sheet-mobile.png` verifies the bottom-sheet hierarchy, filters, status dots, current Batch marker, and portrait scrolling.

## Interaction and runtime checks

### 2026-08-12 live-data verification

- Applied `dreamcatcher_rooms_and_queue` to the connected `MC Home` Supabase project and verified four location records, fixed 8/9/10-minute configurations, a 50-job waiting limit, and zero unexpected queue mutations.
- At 390 × 844, `/worlds/live` loads Kyoto by default from the database, displays `READY`, the Kyoto local clock, `EST. ~8 MIN / ROUND`, and no queue-position or countdown copy.
- Verified the Dreamcatcher information sheet, submission sheet, device-specific `SUBMIT TO KYOTO` action, and full Dreamcatcher list all open and close correctly. No test submission was sent to shared data.
- At 390 × 844, `/devices` and the Cairo Batch route load real published Batch records. The current Batch remains visible in the top tabs, survey rooms use `FIELD SIGNAL` instead of a false `LIVE` claim, and inactive claim data no longer produces a zero-inventory purchase panel.
- Verified Device Info, Updates, Discussion, All Batches, and current-Batch tab state. Browser console reported zero errors on both routes.
- Database privileges verified: anonymous viewers can read public Dreamcatcher metadata but cannot read queue jobs or execute queue advancement; authenticated users can read only their own jobs; only `service_role` can advance rounds.

- Device: switched Info/Updates/Discussion, confirmed Discussion has no duplicated room viewer count, opened and filtered All Batches, and verified each Batch returns to Info by default.
- Worlds: verified the local clock advances, opened the single Describe a Dream sheet, submitted a test dream, and confirmed it joins Queue. Switched to London and verified a 50/50 queue disables submission.
- Signal Dispatch iteration: loaded three current published Signal Dispatch examples, opened `Shadow World`, verified four media choices, selected Signal 02, confirmed it, and verified the list state changes to `CHOICE RECORDED`. The prototype confirmation is deliberately local-only and does not write a test response to production.
- Device detail iteration: expanded Pack One, confirmed Pack Two remains independently expandable, verified the Claim action remains visible and dominant, and confirmed the material panel contains no `VIDEO`, `IMAGE`, `IMAGE SET`, or duration labels.
- Browser console: no errors on either route.
- Responsive overflow: both routes reported a 390 px document width at a 390 px viewport.

## Comparison history

1. Initial browser capture found a P0 layout collapse: the global `.main` flex container shrank the live frame to 2 px while its image overflowed underneath later sections. Fixed by making the room header, object navigation, live frame, panels, and desktop split non-shrinking flex children. Post-fix evidence: `design-qa-device-mobile.png` and `design-qa-worlds-mobile.png`.
2. The first Worlds queue capture showed three-line title wrapping caused by a narrow three-column mobile row. Fixed by stacking the status beneath the title on portrait and restoring the three-column row at 640 px. Post-fix evidence: `design-qa-worlds-queue-mobile.png`.
3. Device material thumbnails initially reused a protected annotated Console image with an automatic crop. Replaced it with the generated camera still so protected brand/product imagery remains untouched. Post-fix evidence: `design-qa-device-info-mobile.png`.
4. The first revised live-overlay capture exposed horizontal cropping at 390 px because the 16:10 feed combined with a 15.5 rem minimum height forced the image wider than its container. Removed the portrait minimum height and organized metadata into a two-row grid. Post-fix evidence: `design-qa-device-mobile.png` and `design-qa-worlds-mobile.png`; both routes now report `scrollWidth: 390` at `innerWidth: 390`.
5. The first Pack accordion capture made its explanation column unnecessarily narrow. Reduced the expanded-copy inset to the standard spacing scale so the text is easier to scan without changing the row hierarchy. Post-fix evidence: the latest `design-qa-device-pack-mobile.png`.
6. The earlier Worlds prototype modeled voting as text directions and placed a new submission directly into Voting. Replaced it with the existing Signal Dispatch pattern: submissions enter Queue, while completed searches surface a four-video choice. Post-fix evidence: `design-qa-worlds-dispatch-list-mobile.png` and `design-qa-worlds-dispatch-detail-mobile.png`.

## Follow-up polish

- P3: once real media arrives, vary the three Device material thumbnails instead of reusing the demo camera still.
- P3: the old concept screenshots show more content inside one tall composite; the production prototype intentionally preserves the design-system type floor and normal scrolling.

## Final result

final result: passed
