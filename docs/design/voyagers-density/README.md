# Voyagers compact directory · 2026-09-29

Latest user revision: Architects initially shows the first four people in the existing order. SHOW ALL displays the full group; COLLAPSE restores four. Browser verified 4 → 6 → 4 at 390×844; TypeScript, page lint and design check passed. [Updated phone screenshot](voyagers-four-mobile.png). Earlier six-Architect screenshots below record the preceding iteration.

Reference: user-provided screenshot of the existing large Architects rows; retain the brand, directory order and grouping, replace inline disclosure with a profile dialog.

- Phone: 40px square portraits, 60px minimum row height, 12px image/text gap; names use 16px body type, locations use the 12px caption floor. Long text wraps naturally.
- Preserve Courier Prime, orange, deep-space blue and off-white tokens, flat surfaces and fine row separators. Full row opens the existing ArchiveSheet dialog.
- Dialog retains role, location, batch, biography, observation days, worlds, join date, social links and the existing owner-only edit action.
- 390×844 browser verification: all six Architects visible on initial screen; sixth row ends at y=628.39, above navigation. No horizontal overflow. 320×740 also has no overflow; sixth row ends at y=629.97. Larger text may grow rows rather than shrink type.
- Desktop 1440×1000: three columns. Intermediate widths use two columns. Phone remains one column.
- Escape closes the dialog, returns focus to the originating row and preserves scroll. Native dialog provides focus containment and background inertness.
- Checks: design check, TypeScript, lint (zero errors; existing repository warnings), 48 test files / 332 tests, production build passed. No production data was changed.

Screenshots: [phone list](voyagers-compact-mobile.png), [phone detail](voyagers-profile-mobile.png), [desktop list](voyagers-compact-desktop.png).
