# App Store listing — Multiverse Collective

Multiverse Collective is the **internal communication tool of the Multiverse
Collective organization**. Everything below describes it that way. Keep the
copy to what the app actually does; the website is the source of truth for
features (see `mobile/README.md`).

Screenshots: `npm run appstore:screenshots` → `docs/appstore/screenshots/`
(see "Screenshots" at the bottom).

## Listing copy (English only)

| Field | Text | Limit |
| --- | --- | --- |
| Name | Multiverse Collective | 30 |
| Subtitle | Internal Comms Platform | 30 |
| Promotional text | Here, we explore parallel worlds together. | 170 |
| Keywords | multiverse,collective,arg,parallel worlds,team,internal,intel,voyagers,devices,mystery | 100 |
| Category | Primary: Social Networking · Secondary: Entertainment | |

**Description**

Somewhere out there, other worlds are running alongside ours. We own the
devices that look into them.

Multiverse Collective is the internal communication tool of the Multiverse
Collective: where members trade dispatches, follow the devices and compare
what each of us has seen.

Anyone curious can read along. Members sign in to join the conversation.

One device. Many worlds. All of us, together.

(Multiverse Collective is an ARG.)

**What's New (1.0.0)**: First release.

**Review notes** (App Review Information)

> Multiverse Collective is the internal communication app of the Multiverse
> Collective organization, run as an alternate reality game (ARG); the
> fiction is intentional. The main sections (Console, Intel, Devices,
> Worlds, Voyagers) are readable without an account. Members sign in with
> email to comment, vote and submit observations. The app also provides
> push notifications for organization updates and a read-only offline copy
> of the last synchronized content. No demo account is required to review
> the public sections; contact us for a member account if you want to see
> signed-in features.

## Screenshots

- Source: the live portrait web app, public routes only (no login), captured
  at 6.9" (1320×2868) and 6.5" (1284×2778). Apple scales 6.9" down for smaller
  iPhones, so 6.9" alone satisfies the requirement; 6.5" is a fallback.
- The app is iPhone-only (`supportsTablet: false`), so no iPad set is needed.
- Order: Console, Intel, Devices, Worlds live, Voyagers, Updates.
- Captures show real production content. Re-run the script right before
  submission so the gallery matches what reviewers see, and check that no
  member names or photos appear that you would not want on the store.
- Heads-up (see `mobile/README.md` "App Store note"): a thin website shell can
  draw a Guideline 4.2 rejection. Push notifications and the offline copy are
  the native value to point at in the review notes.

## App Privacy answers (reference)

Basis: what the code does today. An Account Holder/Admin must submit these in
App Store Connect → App Privacy. Privacy Policy URL: `https://www.multiverseco.org/privacy`
(`src/app/privacy/page.tsx`; deploy before submitting).

- Tracking: **No.** Advertising pixels (Meta, X, Reddit) and the server-side
  Meta/Reddit conversion calls are skipped for the iOS app (user agent
  `MultiverseCollective/`; see `src/components/ad-pixels.tsx`,
  `src/app/api/stripe/webhook/route.ts`, `src/lib/actions/`).
- Collected, linked to the user, not used for tracking: contact info (email,
  name), user content (comments, photos, observations), identifiers (user ID,
  push token), usage data (PostHog), purchases and shipping details (device orders).
- Account deletion: no in-app flow exists yet; Guideline 5.1.1(v) expects one.
