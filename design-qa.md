# UI 2.3 component refresh — design QA

final result: passed for the scoped browser checks below; full product/state acceptance remains pending.

Target: `docs/design/reference/dashboard-updates-events.png`, governed by UI 2.3 dimensions and the user's latest instruction to preserve all content/functions and original brand assets. The reference is 809×1942, normalized to 390px wide; implementation captures are 390×844 CSS pixels. Real current records differ from the illustrative reference. Its reconstructed logo, compressed text and media sizes, navigation icons and sample category distribution are superseded by the authoritative spec. We do not claim literal pixel identity with the generated image.

Combined comparison: `/private/tmp/ui24-shots/dashboard-comparison.png` (source left; implementation Updates centre; implementation Events right). Both source and current renders were viewed together, after corrections.

Initial findings and resolution:

- P1 missing Signal media and established-world publication sources: connect existing visual/poster sources and real timestamps. Current 10/10 update thumbnails loaded; dispatch and Dreamcatcher card images loaded. Unillustrated votes remain truthful text cards.
- P1 Intel action/filter overlap: prevent shared header flex shrinking; revisited actual mobile page and confirmed separation.
- P2 boxed/filled content tabs: replace shared tab styles and room controls with underline tabs and panel associations; revisited Intel, Devices and Worlds.
- P2 Events excessive copy height / weak CTA: compact summaries, cap title display at three lines, align rail controls with heading and use primary orange/deep-blue CTA. Revised Events capture compared with the source.
- P2 secondary visual drift: remove noise texture and non-status colored statistics; normalize input borders, 16px text, 120px textarea, primary CTA contrast; make Profile fields single-column on narrow screens.

Post-fix evidence: `/private/tmp/ui24-shots/dashboard-final.png`, `events-final.png`, `intel.png`, `worlds.png`, `ui-kit-sheet.png`, `dashboard-desktop.png`. Screenshots remain local; authenticated account and workspace captures are not added to the public repository.

Runtime checks: Dashboard 320/390px no document overflow, thumbnail 96/120px respectively; 1280px sidebar only and 340px event cards. UI Kit validation links error/help text and focuses the invalid field; modal focus and discard confirmation work; native range keyboard input works. Profile native fields preserve labels and values. Form attribute comparison preserves handlers and native contracts, except deliberate equivalent Tabs/range adapters.

Limitations: not every route, permission, data or failure state has been opened. No real payments, submissions, uploads or profile saves were performed. Original content remains unchanged. iOS native runtime/real-device acceptance remains separate from the build check. See `docs/design/implementation/component-refresh.md` for exact scope.
