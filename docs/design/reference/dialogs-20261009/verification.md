# Dialog verification


## 2026-10-09 · Centered Dialog implementation

Scope: shared ArchiveSheet shell and local UI Kit examples; existing unrelated QA above remains unchanged.

- Source visual truth: `docs/design/reference/dialogs-20261009/short.png`, `actions.png`, `profile.png`, `reading.png` (853×1844 raster references, logical 390×844; normalized by width, ≈2.19 density).
- Implementation: `docs/design/reference/dialogs-20261009/initiation-390.jpg`, `actions-390.jpg`, `profile-390.jpg`, `reading-390.jpg` (390×844 screenshots, 1 CSS px per screenshot pixel).
- Routes: `/ui-kit#shell-01` and development-only `/dev/voyager-initiation`; no checkout, member update or database writes performed.
- Comparison evidence: source actions image and browser actions screenshot opened together. Full viewport reviewed; component is the comparison target. UI Kit background intentionally differs from source product page. Real initiation short-dialog capture checks original scenario. No separate crop needed.
- Preserved: borderless navy surface, short orange rule, offwhite close, Courier Prime, 24px inset, 20px title, 16px body. Text wraps using actual font and CSS metrics rather than generated raster line breaks. Profile fixture uses existing initials fallback instead of adopting a fictional generated photo. Real profiles retain their existing data and photos.
- Iteration: long dialog initially reached 94% viewport; capped at 80% with fixed header/footer and scrolling body, then captured `reading-390.jpg`. Native Tab at the last action could move to browser chrome; added explicit Tab/Shift+Tab wrap and retested both directions successfully.
- Verified: 390×844 four variants, original initiated explanation and headerless calibration; 320×568 action buttons stack with readable copy; 1280×900 centered desktop. Long body scroll exposes final section while header and Done remain visible. Cancel/Escape/close, preserved draft after Keep editing, Discard changes, focus returned to trigger, body scroll-lock restored. UI Kit browser error log empty.
- Checks: design:check and TypeScript passed; lint has zero errors and 26 workspace warnings; 68 test files / 540 tests passed; production build passed.
- Remaining limits: physical iOS/Android soft keyboard and 200% system text not tested; not every legacy custom modal has been migrated. Shared-component callers inherit new shell; existing inline action groups outside migrated claim flow need per-page footer adoption. No claim that the whole product has been visually accepted.

final result: passed
