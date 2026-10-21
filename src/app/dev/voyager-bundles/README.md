# Voyager bundle mock

Local development route: `/dev/voyager-bundles` (not available in production).

- Reference: current `/voyager-initiation` benefits-first layout and `docs/design-system.md`.
- Preserve the content order: four physical packs, Mission Board, Classified Intel, participation, then Feed posting. Only the final purchase area offers Initial ($38) and Complete ($488); the existing-member toggle shows Console + Pack 4 ($460).
- Reuses the current Initiation CSS, original photographs, Console carousel, Courier Prime font, design tokens, ArchiveButton and centered ArchiveSheet. No synthetic seat counts or member records.
- Purchase layout: portrait-first stacked radio options, 16px padding, 12px option spacing, 16px bundle names, 24px option prices, 16px detail text, 12px notes, 60px primary action. Wider screens retain the same order and a centered 640px purchase column.
- Selection and confirmation are local component state. The mock has no checkout request, server action, persistence or payment integration.
- Actual browser render confirmed at the in-app browser's approximately 482px width; original image assets and text hierarchy were visually inspected. The local route returned HTTP 200.
- Purchase refinement: shared membership rights appear once; cards name the physical contents instead of only referring to pack numbers. The fourth delivery remains explicitly unrevealed. The duplicate total row is removed. Continue displays the selected price. Pointer selection uses one thin border; keyboard-visible focus retains a separate outline.
- Historical interaction verification (before the new price integration; new-price browser acceptance pending): selecting $488 and returning to $38 updates the radio and Continue amount; $488 confirmation lists the matching contents and price; closing restores the purchase page; $460 existing-member view works and returning preserves the previous bundle choice. No checkout is called.
- Accepted screenshots: `output/voyager-bundles/00-user-reference.png` (user-provided original), `01-bundle-choice.png` (refined cards), `02-complete-confirmation.png` (confirmation). Saved files were reopened and visually inspected. The user screenshot supplied the critique evidence: heavy focus-within outline, indirect pack-number descriptions, and a duplicate total. The new screenshot confirms the reduced border treatment and named contents; viewport and scroll differ from the user's crop, so this is not pixel-match acceptance.
- Exact 390×844, 320px, desktop and 200% text zoom acceptance remain pending; the available in-app viewport is 482×755. Screenshots alone do not establish full accessibility compliance.
