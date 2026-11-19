# Onboarding audio scope · 2026-11-20

User request: remove music from onboarding; music belongs only inside the
Initiation briefing. Visual redesign proposals are separate and are not
implemented by this change.

Removed the onboarding soundtrack wrapper and its toggle. The only remaining
`useBriefingSound` consumer is the mounted Initiation briefing. Its audio
player, saved mute choice, first-gesture behavior and unmount cleanup remain
unchanged. Onboarding videos remain muted. Both A/B groups receive this audio
change; the assigned UI, enrollment and purchase attribution stay intact.

Verified locally with placeholder service credentials and a 390×844 viewport:

- Actual `/new?preview=1` steps 1, 2, 3 and the email form work without a music
  control. DOM inspection confirmed the displayed video is muted and no audio
  element is mounted. No form was submitted.
- The existing guest briefing fixture opens to page 1 with Turn music off.
  Switching it off and on updates the control correctly. Closing the briefing
  removes the music control and unmounts the unchanged sound hook.
- Restored the tab to `/new?step=cta` and reset the temporary viewport.

Screenshots: `onboarding-silent-390.jpg`, `briefing-music-390.jpg`.
These are verification screenshots, not proposed redesign options. No
production application, email, checkout or payment was created.

Validation: design guidance, TypeScript, ESLint (0 errors; 26 existing
warnings), all 1,101 pure tests, and production build passed. No database
migration is required or applied.
