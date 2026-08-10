# iOS offline field archive

Build 4 replaces the plain reconnect error with a bundled native offline screen.
It works even when the website cannot load.

## Stored locally

- A fixed label for the most recently visited top-level Console channels.
- The time each channel was last visited.
- At most four entries.

The app deliberately does not store page titles, page content, account details,
profile data, comments, submissions, device records, or Supabase responses.
Offline mode is read-only; all actions continue to require the website and a
network connection.

## Acceptance check

1. Open Dashboard, Intel, Devices, and Worlds while online.
2. Disable Wi-Fi and cellular data.
3. Confirm the native `SIGNAL INTERRUPTED` archive appears without a web error page.
4. Confirm Field Manual and Last Known Channels remain readable.
5. Confirm no account name, email, private record, post body, or user content appears.
6. Tap `SEARCH FOR SIGNAL` while offline and confirm the screen remains stable.
7. Restore the network and confirm the Console reloads automatically at the previous channel.
8. Force-close while offline, reopen, and confirm the archive still appears.

The iOS Simulator can validate the UI and reconnection state. Release acceptance
should also be repeated on a physical iPhone before uploading Build 4 to TestFlight.
