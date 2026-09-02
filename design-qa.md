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

## Analog interference live-filter QA — 2026-08-22

### Comparison setup

- Source visual truth: `/Users/will/.codex/generated_images/01a01911-972e-7800-8756-0d870c299460/exec-10a98d21-0e63-4194-9b9f-bd0b095f0856.png` — 853 × 1844 px, the user-approved analog-interference revision.
- Browser-rendered implementation: `/private/tmp/putopia-live-analog-mobile.png` — 390 × 844 px.
- CSS viewport: 390 × 844 px at the in-app browser's standard capture density.
- Density normalization: both images were reviewed together in one comparison input; the 853 px-wide source was interpreted at its equivalent 390 px portrait width. The source is a tall art-direction composite, while the implementation is one real viewport.
- State: Kyoto selected, device READY, Queue selected, Cosmo resting clip actively playing.

### Findings

No actionable P0, P1, or P2 issues remain for the selected filter direction.

- Fonts and typography: the filter is isolated below the metadata layer, so Courier Prime labels, weights, tracking, status text, and the 12 px type floor remain unchanged and legible.
- Spacing and layout rhythm: the existing 390 px portrait composition, 16:10 live frame, clipped corner, section spacing, and bottom navigation remain unchanged. The browser reports a 390 px document width with no horizontal overflow.
- Colors and visual tokens: structural UI continues to use the canonical deep blue, off-white, orange, and green tokens. Desaturation, sepia, brightness variation, and interference blending apply only to the live media pixels.
- Image quality and asset fidelity: the implementation matches the approved direction's reduced clarity, analog scanlines, RF-style snow, subdued chroma, and dark surveillance tone. The broad rolling band and synchronization jitter are animated and therefore appear at different positions than the still source by design.
- Copy and content: all production copy, location, state, clock, navigation, and actions are preserved exactly; no decorative filter controls or mock labels were added.

### Full-view and focused evidence

- Full-view comparison confirms that only the live feed changed and that the production page hierarchy was preserved rather than copying the generated mock's incidental scaling differences.
- A separate focused crop was unnecessary: at 390 × 844 the live viewport is 352 × 221 px and both the device silhouette and interference texture are clearly judgeable in the full-view implementation capture.

### Interaction and runtime checks

- Confirmed native `loop` remains enabled and the 8.291678-second Cosmo clip crosses its seam while keeping the same DOM video source, remaining unpaused and ready.
- Confirmed the live filter resolves to blur/desaturation/contrast/brightness/sepia treatment plus active `signalRoll` and `signalSnow` overlays.
- Switched from Queue to Dispatch and back; the animated overlays do not intercept pointer input.
- Browser console reported no filter/player errors. Two pre-existing Next Image aspect-ratio warnings for the VI logo assets remain unrelated to this change.
- Targeted ESLint, seven playback/tag tests, TypeScript, the full 113-test suite, and the production Next.js build pass.

### Comparison history

1. The first browser-rendered filter pass produced no P0/P1/P2 mismatch. The live image is intentionally less sharp than the original feed, the dynamic interference has enough contrast to be visible without obscuring the device, and the UI overlay remains crisp. No visual correction loop was required.

## Final result

final result: passed

## Live signal behavior QA — 2026-08-26

### Comparison setup

- Source visual truth: `/Users/will/Sites/putopia/worlds-live-mobile-qa.png` — 390 × 844 px, plus the existing analog-interference direction documented above.
- Browser-rendered implementation:
  - `/Users/will/Sites/putopia/design-qa-worlds-live-signal-mobile.png` — 390 × 844 px.
  - `/Users/will/Sites/putopia/design-qa-worlds-live-signal-desktop.png` — 1280 × 800 px.
- Combined comparison input: `/Users/will/Sites/putopia/design-qa-worlds-live-signal-comparison.jpg` — 780 × 844 px, source and implementation at equal 390 px widths.
- CSS viewport and density: 390 × 844 px and 1280 × 800 px at device scale 1. No density normalization was required for the equal-size portrait comparison.
- State: Kyoto selected, device READY/resting, Queue selected, Cosmo video actively playing.

### Findings

No actionable P0, P1, or P2 issues remain.

- Fonts and typography: the 12 px type floor, Courier Prime hierarchy, uppercase labels, and metadata tracking are preserved. `LIVE · CHECKED …` remains legible and does not collide with the state, location, or clock at 390 px.
- Spacing and layout rhythm: the portrait live frame remains 352 × 221 px and the document reports `scrollWidth: 390` at a 390 px viewport. Desktop expands to a 917.6 × 517 px frame without changing the primary hierarchy.
- Colors and visual tokens: all structural UI still uses the canonical deep blue, nucleus orange, off-white, and semantic status colors. Phase-dependent interference is confined to the media surface.
- Image quality and asset fidelity: the resting feed is intentionally softer and less saturated than the source. Starting/stopping use stronger signal loss, working uses moderately elevated instability, and the 920 ms reconnect mask hides the source swap without replacing or fabricating the Cosmo media.
- Copy and content: `CHECKED NOW` / `CHECKED nS AGO` comes from the real room-fetch observation timestamp. `SIGNAL REACQUIRING` appears only during an actual editorial clip swap.

### Full-view and focused evidence

- The combined equal-width comparison verifies that the new treatment changes the live-media character while preserving the existing navigation, live-frame geometry, status hierarchy, controls, and bottom navigation.
- A separate focused crop was not needed: the full 390 × 844 capture renders the entire 352 × 221 live frame and all metadata at readable scale. The 1280 × 800 capture verifies the expanded feed and desktop split.

### Interaction and runtime checks

- Native video playback reported `readyState: 4`, `paused: false`, and resting phase; steady clips retain the native `loop` element.
- Observed a complete scheduled reconnect in the real browser: the resting asset changed from `6a8566e041b16262cb633bb9` to `6a8566e441b16262cb633bbf` after the configured 45–90 second interval.
- The 30-second server refresh did not reset the reconnect scheduler, and the status freshness label reset from each real room observation.
- Browser console reported no player or layout errors. One pre-existing Next Image aspect-ratio warning for `/assets/vi-wordmark.png` remains unrelated.
- Targeted ESLint, 10 live-playback tests, TypeScript, the full 116-test suite, and the production Next.js build pass.

### Comparison history

1. The first implementation check found a React purity error from creating the observation timestamp inside the server component render. The timestamp was moved into the room-fetch boundary, so it now describes the real data observation and passes static analysis.
2. The first browser-rendered comparison found no visual P0/P1/P2 issue. No corrective visual iteration was required.

## Final result

final result: passed
