# Dashboard guest introduction · 2026-09-29

Restores the guest copy and two actions from `3eacb25` using the current design system. Reference: the historical guest hero for content and action order; UI 2.3 for the compact brand header, palette, type and shared buttons. The old device showcase is not repeated on Dashboard.

Guest order: centered large original wordmark → 140px original symbol → original introduction → REQUEST ACCESS / LOG IN → statistics → Updates → Events. The compact mobile brand header is hidden for guests. Signed-in visitors retain their account header; Voyager and Architect roles see VOYAGER, while Applicant and other non-member roles see APPLICANT without the selected-to-explore copy. The guest introduction is conditioned on the server-provided `guest` flag.

Verified against the local application at 390×844 first, then 1440×900. See [mobile](mobile.png) and [desktop](desktop.png), updated for the centered brand revision. The wordmark fills 85.8% of the introduction width, with 24px gaps between brand assets and the introduction. The introduction uses the 20px title token, a 1.5 line height and a 20px gap before the actions. Shared primary and secondary buttons retain Courier Prime, brand colors and 48px hit areas. At 390px the buttons sit side by side without horizontal overflow; flex wrapping supports narrower widths. No new imagery or decorative surface is added.

Checked link destinations: `/new` and `/login`. No registration or login form was submitted. Authenticated rendering was inspected in code, not through a live member session. The existing device count appeared unavailable (`?`) during capture.

Validation: design check, TypeScript, 349 tests on the isolated release branch and production build passed. Lint finished with zero errors and 26 warnings in the working tree. Existing unrelated work was retained.
