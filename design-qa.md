# UI 2.3 reference alignment — review record (2026-09-10)

final result: passed

This result applies only to the corrected primary-page compositions listed below, compared at 390×844. It is not an acceptance of every product route, permission state, or native iOS runtime. Earlier broad acceptance language is superseded by this record.

## Sources and comparison method

- Intel: `docs/design/reference/intel.png`.
- Voyagers: `docs/design/reference/voyagers.png`, checked at both list start and the bottom Logs action.
- Devices: `docs/design/reference/devices-selected-nav.png`.
- Dashboard: `docs/design/reference/dashboard-updates-events.png`; latest user screenshot additionally restores the Voyager welcome/status module before the original counts.
- Worlds uses the shared live-room composition; it has no separately approved exact reference in this pass.

Each source was scaled proportionally to 390px and placed beside the current 390×844 implementation. Combined boards were opened and inspected, including a second pass after typography and spacing corrections. Evidence remains local in `/private/tmp/ui27-shots/`: `intel-comparison.png`, `voyagers-comparison.png`, `devices-comparison.png`, `dashboard-comparison.png`, `voyagers-bottom.png`, `dashboard-voyager.png`, `worlds.png`, `logs.png`, `ui-kit-intel.png`, `ui-kit-voyagers.png`. Account screenshots are not published in the public repository.

## Findings and revisions

| Priority | Initial discrepancy | Correction and review |
| --- | --- | --- |
| P1 | Logo masthead remained on content pages | Removed active app mastheads and their reserved space, including root tabs and offline shell. The restored account-status device symbol is content, not a masthead. |
| P1 | Voting Hub and Voyager Logs dominated the top of lists | Voting Hub and My Profile are light top-right links. Logs is the primary action after the member list. Reviewed top and bottom screenshots. |
| P1 | Intel and member cards retained heavy legacy frames | Intel lead/Recent layout and square-portrait directory rows now follow the reference. Existing detail content, comments, member fields and editing remain accessible. |
| P1 | Events hidden by login/participation eligibility | Public open events render before login; permission checks stay at their destinations. Guest read showed 12 cards across five available types. |
| P1 | Voyager welcome/status removed with header cleanup | Restored Welcome Voyager, identity, Path, personal awaiting count and original day-count policy above collective counts. Reviewed account state (8 awaiting / 0 days) and the day-count sheet. |
| P2 | Excessive timeline spacing and heavy action text | Tightened time/media layout, regular display weights, 16px primary actions with aligned rail CTA baselines. Reopened composite comparisons. |
| P2 | Devices showed blank placeholder despite an available image | Actual batch media shown when camera is disconnected; Archive opens the existing sheet. Live camera and ownership-dependent controls remain truthful. |
| P2 | UI Kit still illustrated the old Intel list and Logs placement | Updated fixtures to the same editorial/list layout, root actions and restored welcome component. Logs navigation exercised. |

## Intentional differences from generated references

- User decisions remove mastheads/repeated tab names and retain original counts plus the personal welcome/status block. These are not missing-image defects.
- Real text, members, event dates and statuses replace fictional sample records. Six architects remain six; no eligible Console owner control is invented for an account without one. Votes without image data remain text cards.
- Minimum readable text is 12px; primary actions are 16px and at least 48px high. The reference's compressed sub-12px text and undersized targets are not copied. This changes total page height.
- Original brand assets and protected startup animation remain unchanged. Flat surfaces replace generated gradients/glows.

## Verification scope and limitations

390px browser inspection covered all five roots, UI Kit, Logs and Profile; 320px covered Dashboard/Events and Voyagers; 1280px Dashboard was checked for overflow. Header content, links and the Console sheet were exercised without business writes. Events advanced from 1/12 to 2/12 in the fully hydrated local product page; the alternate 127.0.0.1 dev preview did not hydrate reliably, so deployed guest behavior must be checked separately.

Web/mobile type checks, lint, pure tests, design gate and production build are recorded with the implementation release. No payment, submission, profile save or production-data mutation was performed. Native iOS code and offline snapshot compatibility were updated; simulator/real-device screenshot acceptance remains pending. Other secondary routes and error/permission states must receive their own screenshot comparison before being marked complete.
