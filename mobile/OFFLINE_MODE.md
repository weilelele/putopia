# iOS full offline snapshot

Build 5 keeps the Multiverse Console useful when the device has no usable network
connection. While online, the original production website remains the complete iOS
experience; the native snapshot never replaces it.
The native offline view mirrors the app's five primary destinations and renders
the last successful content snapshot instead of replacing the product with a
generic error or field-manual page.

## Saved on the device

- Dashboard summaries and Console functions.
- Public Intel articles, including full text and one cached image per article.
- The Device Archive and cached device images.
- World Records and pipeline summaries with cached cover images.
- Voyager directory cards and published Voyager Logs.
- Current and recent vote questions and options.
- The viewer's display name and role so the saved Console keeps its identity.
- A maximum of 80 media files. Each file is limited to 8 MB.

The snapshot is refreshed at most once every five minutes while the website is
successfully loaded. It is stored only inside the iOS app sandbox. Member data
and downloaded media are removed when the website reports that the user is no
longer authenticated.

## Deliberately not saved

- Email addresses, passwords, authentication tokens, push tokens, or API keys.
- Classified Intel.
- Social profile URLs and account-editing fields.
- Comment bodies, private drafts, submissions, or individual vote responses.
- Admin pages or server-side operational data.
- Full video files.

Offline mode is read-only. Voting, comments, uploads, profile edits, submissions,
and Signal Dispatch actions explain that a connection is required. They are not
queued or replayed automatically.

## Acceptance check

1. Sign in and visit Dashboard, Intel, Devices, Worlds, Voyagers, and Logs.
2. Wait for the initial snapshot and media download to finish.
3. Disable Wi-Fi and cellular data, then relaunch the app.
4. Confirm the normal five-destination navigation remains available.
5. Open saved Intel, vote, device, world, Voyager, and Log detail views.
6. Confirm saved images render and every section shows the last-sync timestamp.
7. Confirm write actions remain read-only and do not appear to succeed.
8. Restore the network and confirm the website reloads at the prior live route.
9. Sign out while online, go offline, and confirm member-only snapshot data is gone.

Release acceptance must be repeated on a physical iPhone before Build 5 is
uploaded to TestFlight.
