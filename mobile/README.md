# Multiverse Collective iOS

This iOS shell reproduces the current production website at
`https://www.multiverseco.org/console?source=ios_app` inside WKWebView.

## Repository boundary

- Android is delivered only as the PWA owned by the root Next.js project.
- iOS is owned by this `mobile/` package and has its own dependencies and
  TypeScript configuration.
- Root web typecheck, lint, tests and build exclude `mobile/`.
- `npm run check` validates this package without building or changing the web
  application.
- Build output, Pods, archives, signing material, local Xcode settings and
  environment files are never committed.

## Product boundary

- The website is the single source of truth for UI, authentication, permissions,
  data and member features.
- The iOS project does not connect to Supabase directly and contains no API keys.
- Native iOS behavior is limited to system notifications, safe deep links,
  network recovery, and a read-only snapshot of the last synchronized Console.
  Website data remains the single source of truth.
- Website deployments become available in the app without a second mobile data
  implementation.

## Supported browser behavior

- Persistent website cookies and local storage.
- Back/forward swipe gestures and pull to refresh.
- JavaScript, full-screen/inline media, forms and uploads.
- `mailto:`, `tel:` and other non-web schemes are passed to iOS.
- A native offline copy of Dashboard, Intel, Devices, Worlds, Voyagers, Logs,
  and Votes is shown only when the device has no usable network connection.
- The copy stores sanitized content and a bounded media cache inside the app
  sandbox. It excludes credentials, classified Intel, comments, private drafts,
  social links, and individual vote responses.
- Offline content is read-only; writes always require the live website.
- The Console automatically reconnects when the network returns.

## Local validation

```bash
npm ci
npm run check
npx expo run:ios
```

The native iOS project is versioned. Do not run `expo prebuild --clean` unless
the resulting native project changes are intentionally reviewed and committed.

## Team package

The unsigned Simulator `.app` can be zipped and installed on another Mac with
the matching iOS Simulator runtime. A real-iPhone `.ipa` or TestFlight build
requires the team's Apple Developer signing identity and provisioning profile.
See `TESTFLIGHT_HANDOFF.md` for the exact team signing and upload workflow.

## App Store note

A website-only shell can be rejected under App Review Guideline 4.2 (minimum
functionality). This package is appropriate for team validation. Before public
submission, the team should decide which native capability will provide durable
App Store value without changing the website's product rules.
