# Native apps (iOS + Android) via Capacitor

This wraps the **existing** `multiverseco.org` web app in real native iOS and
Android shells using [Capacitor](https://capacitorjs.com). The goal is
**three-end sync**: web + iOS + Android all render the same Next.js frontend
backed by the same Supabase/Mongo/Stripe backend, so a change ships to all three
at once with no second UI codebase.

## Strategy: remote URL, not static export

This is a Next.js 16 App Router app with Server Components, Server Actions, and
API routes — it **cannot** be statically exported (`output: 'export'` would drop
all of that). So the native shell does **not** bundle the site; it loads the
live deployment over the network:

```
capacitor.config.json → server.url = https://multiverseco.org
```

Consequences (intended):

- The app is a native WebView pointed at production. Ship to the web → the apps
  update instantly, no App Store / Play resubmission. This *is* the sync.
- It needs a network connection to start (no offline). Acceptable for a v1.
- For staging, temporarily point `server.url` at a branch preview URL.

## Prerequisites (local machine)

| Target  | Needs |
|---------|-------|
| iOS     | macOS + **Xcode**, **CocoaPods** (`brew install cocoapods`), an Apple Developer account to run on a device / submit |
| Android | **Android Studio** + SDK, **JDK 17** |

You can scaffold and run one platform without the other.

## One-time scaffold (the Bash-gated steps)

From the repo root:

```bash
# 1. Install Capacitor (added as devDependencies)
npm install -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android

# 2. Generate the native projects (reads capacitor.config.json)
npx cap add ios
npx cap add android

# 3. Sync config into the native projects (re-run after any config change)
npx cap sync
```

This creates `ios/` and `android/` folders — commit them; they are the native
projects. `webDir` points at `public/` only to satisfy the CLI; with
`server.url` set, the bundled files there are an unused fallback.

## Run it

```bash
npx cap open ios       # opens Xcode    → pick a device/simulator → Run
npx cap open android   # opens Android Studio → Run
```

You should see the live console load inside a native frame.

## Known follow-ups before this is shippable

These are **not** done yet — the scaffold above only proves the shell loads.

1. **Magic-link auth deep links (highest priority).** Login is Supabase email
   magic-link → `/auth/callback`. In a native shell that callback must return to
   the app, not Safari/Chrome. Configure **Universal Links (iOS)** + **App Links
   (Android)** for `multiverseco.org`, and add the Supabase redirect URL.
   Verify the session survives killing and reopening the app.

2. **Payments / App Store compliance (highest risk).** The $12 Initial Voyager
   Pack is a *physical* shipped item (≈4-week fulfilment) — physical goods are
   exempt from Apple/Google in-app-purchase rules and may use Stripe. But the
   purchase also unlocks Voyager membership, which a reviewer could read as a
   *digital* entitlement and reject. Mitigations: keep the purchase framed and
   described as the physical pack; open Stripe Checkout in the **system browser**
   (not the in-app WebView) via `@capacitor/browser`. Resolve this *before*
   submitting — it can block the whole release.

3. **Safe areas / status bar.** Add `@capacitor/status-bar` and verify notch /
   home-indicator insets on a real phone (the app is portrait-first already, so
   this is polish, not a rebuild).

4. **External links.** Make outbound links (email, social) open in the system
   browser, not navigate the shell.

5. **Push notifications (optional, likely wanted).** Today reminders are email +
   the `signal-recall` cron. To go native: `@capacitor/push-notifications` +
   APNs/FCM + store device tokens in Supabase + send from the server. ~1 week.

6. **Store assets.** App icons, splash screens, iOS Privacy Manifest, listing
   copy + screenshots.

## Config reference

`capacitor.config.json` at the repo root:

- `appId` — `org.multiverseco.app` (the iOS bundle ID / Android package; hard to
  change after first store submission — confirm before shipping).
- `appName` — `Multiverse Collective` (home-screen label; shorten if it clips).
- `server.url` — the live site the shell loads.
- `server.allowNavigation` — domains the WebView may navigate to in-app
  (Supabase, Stripe). Everything else should open externally.
