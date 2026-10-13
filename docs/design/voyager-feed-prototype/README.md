# Voyager feed interaction prototype

Initial direction: first displayed ImageGen mock, 2026-10-12. Updated 2026-10-13 per user feedback: compact X-like feed, floating composer, full post-detail screen, registration-gated feed.

Run the existing Next.js development server and open `/dev/voyager-feed`. This development-only route returns notFound outside development. It does not replace `/voyagers`.

## Scope

- FEED, MEMBERS and LOGS use local sample content.
- Preview toolbar switches between distinct guest, unregistered, applicant, voyager and architect accounts.
- Voyager/Architect: publish text (up to 500 characters) and an optional local JPG/PNG/WebP under 5 MB.
- Applicant and above: like/unlike posts and replies, add replies.
- Only authors: edit/delete their own posts or replies. Architect is not an ownership override.
- Guest and unregistered: no feed posts, images or replies are rendered, including when a post fragment is present. The centered gate reuses Dashboard guest branding, intro and Request Access / Log In buttons. These buttons link to the existing access/login pages; no submission is performed by this prototype.
- Own-content menus, delete confirmation, dirty-dialog protection and image attachment/removal are interactive.
- A persistent bottom-right POST control opens the centered composer dialog for Voyager/Architect and a centered permission explanation for Applicant. The permission dialog explains that becoming a Voyager unlocks publishing, with a “Voyager Initiation” primary link to `/voyager-initiation`. No top composer strip.
- Clicking post text, media or reply count enters a second-level post screen using `#post=<id>` history. Back restores feed scroll; reply drafts are retained per post in memory. Secondary page contains the original post, reply composer and thread.
- The shared centered ArchiveSheet remains for compose, permissions, edit, delete and profile dialogs.
- Reset restores sample content. Reload discards all changes. There is no persistence, live publishing, actual login, moderation dispatch or database write in this prototype. The existing site root providers are still mounted.
- Top-level navigation outside Voyagers opens explanatory preview dialogs; it does not navigate into production workflows.

## Design decisions

Original brand images, Courier Prime and canonical colors are preserved. The 2026-10-13 user request explicitly targets X feed density: browser inspection of https://x.com/SpaceX measured 15px text, 20px line height, zero text margins, 2px text-group gap and an 8px avatar/content gap. We adopt 15/20 feed text, 40px avatar + 8px gap, 12px outer vertical post padding and 12px minimum metadata. Detail body and editable fields retain 16px. Interactive controls retain 44px targets. The font remains Courier Prime rather than X's TwitterChirp.

X's official timeline guide confirms that clicking post text opens a post detail page: https://help.x.com/en/using-x/x-timeline. No feed ranking/following functionality is copied. Latest user decisions supersede the original image's composer and public guest access.

## Production follow-up

This is not a production authorization implementation. Before integrating, enforce registration before returning any feed payload (not just hiding it in CSS), then enforce the approved role matrix and ownership rules in server actions and database policies, using the authenticated account ID (never the role selector). Add durable storage, upload validation, moderation/report delivery and real session handling. Final deletion policy for posts with other users' replies should be decided before data integration; the prototype removes the local thread on confirmation.

## Asset record

Selected source: `/Users/will/.codex/generated_images/01a12ef2-2694-7951-8530-6745023fb385/exec-571250ff-49ec-4b2a-b2fb-56aa23fc5045.png`.

- `public/prototypes/voyager-feed/coast-v1.png`: standalone misty rocky shoreline, evergreen hills, muted orange clouded dawn; source mock attached to ImageGen. Inspected: no text, hardware, people or UI.
- `public/prototypes/voyager-feed/ryo-v1.png`: fictional older Japanese artist, grey hair, dark textured jacket, warm window light, charcoal background, square face/shoulders crop. Inspected for small avatar use.
- `public/prototypes/voyager-feed/maren-v1.png`: fictional adult Scandinavian woman, short blond hair, subdued cool head/shoulders portrait, dark blue background. Inspected for small avatar use.

Assets are illustrative, not actual member submissions or profile data. Original generated files remain untouched.
