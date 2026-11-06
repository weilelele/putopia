# Social recruitment — teaser and public brief

The social poster is an invitation, with the image-generated question “CAN YOU MAKE ANOTHER UNIVERSE GO VIRAL?”, the internship title, original wordmark + graphic logo, and a real QR code. The QR and visible address both point to https://multiverseco.org/recruit/social (the site's verified configured domain). Exact roles and requirements live in selectable HTML rather than in the social image.

Visual references: public/assets/voyager-briefing/pack-1.jpg for poster materials and lighting; docs/design-system.md for the responsive page. Both original logo files are composited proportionately without recoloring or redrawing. The website uses flat brand surfaces and Courier Prime.

The complete final poster is public/assets/recruit-social/social-recruitment-poster.png. Background and printed teaser copy were generated with built-in ImageGen; real QR, original logos and address were composited afterward. QR error correction M, 4-module quiet zone, 7 pixels per module. The exported poster was decoded using macOS CoreImage and returned https://multiverseco.org/recruit/social.

Web verification: anonymous GET /recruit/social returns 200; 320×844, 390×844 and 1440×1000 render without horizontal overflow or browser exceptions. Body is 16px / 30.4px (1.9), minimum text 13px; section spacing 64px mobile / 80px desktop, bullet gaps 28px. Both protected original logo images load. Canonical metadata is correct. Email link uses mailto:architect@multiverseco.org with a prefilled application subject; Dashboard link goes to /console. Only the exact public recruitment route and its trailing-slash form are allowlisted; nested paths remain closed. No schema, DB or payment changes.

Validation: design guidance, TypeScript, ESLint (no errors; existing warnings), 109 Vitest files / 946 assertions, production build passed. Browser evidence is in browser-verification.json and viewport screenshots. The app uses its own scrolling shell, so the top and application screenshots capture the actual visible viewport.

## Exact ImageGen prompt

Use case: ads-marketing. Create a striking minimalist social-media RECRUITMENT TEASER POSTER, portrait 4:5, ideally 1536x1920. This is an ATTENTION poster that directs people to a full job webpage, not the detailed job description. Reference image is the actual Pack 1 stationery aesthetic: top-down real camera photograph, a dark navy-black tactile archival letter on dark warm wood, subtle warm tungsten light, a small plain brass clip only near the extreme lower-right edge. Frontal paper, almost square to camera, navy paper covers 94% of image. Professional original premium editorial composition. No space landscapes or portals, no screens, no fake document numbers, no HUD, no UI buttons, no new symbols. Colors restrained: midnight navy #080C20, burnt orange #E35205, off-white ink, natural wood/brass at the edges only.
VERY SPACIOUS TYPOGRAPHY: very few words; huge confident typewriter/Courier Prime print, generous line-height and substantial pauses between the 3 information groups. Everything below is PRINTED IN THE IMAGE, realistic subtle ink on paper, not a floating text overlay. Exact spelling required. Headline much bigger than supporting copy, off-white bold with GO VIRAL? in orange. Preserve premium material and camera realism.
TOP 25% is completely EMPTY dark navy paper reserved for protected original wordmark and graphic logo that will be composited later. No brand name or generated logo.
The middle contains only this exact printed copy, placed in this order:
CAN YOU MAKE
ANOTHER UNIVERSE
GO VIRAL?

WE'RE HIRING
Social Media &
Community Intern

Games. Sci-fi. Fantasy. AI.

The main question sits around 29-48% height, headline 3 lines with roomy leading. Hiring block around 56-65% height, readable large Courier Prime monospaced body. Genre line around 69% height. These blocks must be distinct and airy.
BOTTOM 25% is entirely UNPRINTED navy paper for a REAL QR code, call-to-action and website address that we will composite later. Do NOT generate any QR code or URL, email, placeholder square, caption or lettering in that lower reserved area. No graphic boxes or printed frame. Keep the paper frontal and undistorted so actual logo and functional QR can be composited cleanly. Poster should spark curiosity among game, sci-fi and fantasy fans who enjoy creating with AI. Do not add responsibilities or requirements beyond the exact teaser copy.
