# App Review reply — Guideline 2.1 (Information Needed)

Draft answers to Apple's six requests. Everything below is based on what the
code does on `main`; items marked **TODO** need a human decision or action
before replying. Paste the same text into the reply *and* the App Review
Information → Notes field.

## Before replying (status)

1. **Account deletion — built.** My Profile → bottom of the page → "Delete my
   account" (type DELETE). Needs no schema change. Server logic in
   `src/lib/actions/account-deletion.ts`.
2. **Report and block — built.** Under every discussion comment, Live Chat
   message, batch-discussion post and world report: "Report" (reason + details,
   hides it for the reporter, emails the team) and "Block" (hides the member's
   posts for the blocker). Blocked members are listed and can be unblocked in
   My Profile. Moderators review at `/admin/reports` (remove or dismiss).
   **Requires `supabase/schema_v87.sql` on production before it works** —
   not applied yet.
3. **Demo account — TODO.** Create a dedicated member account (not a real
   person's) and put its credentials in the App Review Information sign-in
   fields. Remove "contact us for an account" from the notes.
4. **Guideline 3.2 framing — decided: public community app.** The listing,
   subtitle and privacy policy no longer say "internal tool". Update the
   subtitle in App Store Connect to match (`Explore Parallel Worlds`).
5. **Screenshot 01 — TODO.** It shows the logged-out landing (title art +
   Request Access / Log in), which Apple's 2.3.3 note warns about. Make an
   Intel or Devices screen the first image.
6. **Real build on a real device — TODO.** This work ships in the *web* app, so
   it is live for the iOS shell after deploy and no new binary is needed, but
   test it on a physical iPhone before replying.
7. **24-hour moderation commitment.** Someone on the team must actually check
   `/admin/reports` (and the report emails to voyagers@multiverseco.org) daily.

## 2. Purpose and target audience

> Multiverse Collective is the community app of the Multiverse Collective, an
> alternate reality game (ARG) built around a fictional premise: a collective
> of people who own devices that look into parallel worlds. The app solves a
> simple problem for the game's participants — keeping up with a story that
> unfolds across dispatches, devices and live observations — by putting it all
> in one place on iPhone.
>
> Audience: adults and teens (13+) who enjoy ARGs, mystery and sci-fi
> storytelling. Anyone can read the public sections. Members sign in to comment,
> vote on signal dispatches and submit observations. Physical collectible
> devices can be reserved by members through the website's checkout.

## 3. Setup and access instructions

> No setup needed to browse: open the app and use the bottom tabs — Console,
> Intel, Devices, Worlds, Voyagers. These are readable without an account.
>
> To see member features, sign in with the demo account:
> Email: **TODO** · Password: **TODO**
> (Log in → enter email and password.) Then:
> - Intel: open any post and add a comment.
> - Worlds: open the live room and read or send a chat message.
> - Devices: open a device batch to view details and the order flow (checkout
>   is processed by Stripe in a web view; the demo account does not need to
>   complete a purchase).
> - Report / Block: under any comment, chat message or world report tap
>   "Report" (choose a reason) or "Block" (hides that member's posts).
> - Profile: open "My profile" to edit details, see blocked members, and
>   delete the account (bottom of the page → "Delete my account" → type DELETE).
> Push notifications are optional and can be allowed or denied at first launch.

## 4. External services

| Service | Used for |
| --- | --- |
| Supabase | Authentication (email sign-in links / password), database, file storage |
| MongoDB | Content catalog data for signals and frequencies |
| Vercel | Hosting the website that the app displays |
| Stripe | Payment processing for physical device orders (card details never reach our servers) |
| Resend | Transactional email (sign-in links, order and update emails) |
| Loops | Newsletter and member email list |
| PostHog | Product analytics |
| Apple Push Notification service | Optional push notifications |
| Anthropic (Claude API) | Used only in internal admin tooling to draft content; not exposed to app users **TODO: confirm** |

No advertising or tracking SDKs run in the iOS app (Meta, X and Reddit pixels
are website-only and are disabled in the app).

## 5. Regional differences

> The app's content is the same in every region and is in English. The only
> regional difference is physical device shipping, which is limited to the
> countries enabled at checkout (currently **TODO: confirm `DEVICE_SHIPPING_COUNTRIES`
> in production; the code default is US only**). Browsing, accounts, comments,
> voting and notifications work identically everywhere.

## 6. Regulated industry / third-party material

> The app is not in a regulated industry and does not provide financial,
> medical or legal services. All stories, images and videos are original
> works created by or licensed to Multiverse Collective. **TODO: confirm
> licenses for any third-party imagery or video.**

## 1. Screen recording (physical iPhone, latest iOS)

Record in one take, starting from the home screen:

1. Launch the app from the icon; allow or decline the notification prompt.
2. Browse the five tabs briefly (Console, Intel, Devices, Worlds, Voyagers).
3. Log out if needed, then **create a new account** (register flow) and log in.
4. Post a comment on an Intel item; send a Live Chat message in Worlds.
5. Tap **Report** on a comment (pick a reason, send), then **Block** another member; open My Profile to show the blocked list.
6. Open a device batch and show the order flow up to the Stripe page (stop
   before paying, or use a test-mode order if one exists). State aloud that
   physical goods are sold through Stripe.
7. **Delete the account**: My Profile → bottom → Delete my account → type DELETE → confirm; show that you are signed out.

Upload the video in the Resolution Center reply (App Review → Messages).

## Notes field text (short version)

> Community app of the Multiverse Collective ARG. Public sections (Console,
> Intel, Devices, Worlds, Voyagers) need no login. Demo member account:
> **TODO email / password**. Features: comments, voting, observations, live
> chat, optional push notifications, read-only offline copy of recent public
> content, physical device orders via Stripe. Services: Supabase, MongoDB,
> Vercel, Stripe, Resend, Loops, PostHog, APNs. Content is identical in all
> regions; device shipping limited to **TODO** countries. Account deletion (My Profile → Delete my account) and
> content reporting/blocking (Report / Block under every post) are available in-app. Screen
> recording attached in the Resolution Center reply.
