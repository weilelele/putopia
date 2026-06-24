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

## Auth / login flow (deep links)

**Finding:** login is actually **email + password** (`signInWithPassword`), not
magic-link. Because the shell is a remote-URL WebView pointed at the live site,
**returning-user login already works in the app** with no deep links — session
cookies persist exactly as on the website.

The only seam is **first-time onboarding** (`/new` → invite email → set
password): the email link opens in Safari, not the app. We close it with iOS
**Universal Links** + Android **App Links** for `multiverseco.org/auth/*`.

### Done in code (this branch)

- `App.entitlements` → `applinks:multiverseco.org` (+ `www`), wired into the iOS
  target (`CODE_SIGN_ENTITLEMENTS`).
- `AndroidManifest.xml` → `autoVerify` intent-filter for `https` `/auth` +
  `/register`.
- `/.well-known/apple-app-site-association` + `/.well-known/assetlinks.json`
  route handlers (served as `application/json`; `proxy.ts` matcher excludes
  `.well-known` so they are not auth-gated).
- `@capacitor/app` + `NativeBridge` (`src/components/native-bridge.tsx`):
  listens for `appUrlOpen` and routes the incoming https link into the WebView.
  No-op on web.
- `resendAccessLink` now emails a link on **our** domain (`/auth/callback?
  token_hash=…`) instead of the `*.supabase.co` action link, so it is
  Universal-Link-eligible. Web-compatible (the callback already verifies
  `token_hash`).

### You must do (external — can't be done from code)

1. **Xcode signing.** Open `ios/App/App.xcodeproj` → target **App** → *Signing &
   Capabilities* → select your **Team**. The Associated Domains capability is
   already present via the entitlements file.
2. **Set `APPLE_TEAM_ID`** (your 10-char Team ID) in the **production** env
   (Vercel). The AASA file embeds it; Universal Links won't verify until it's the
   real ID, not the `TEAMID` placeholder.
3. **Deploy** so `https://multiverseco.org/.well-known/apple-app-site-association`
   is live **before** installing the app (iOS fetches it at install time).
   Verify: `curl -i https://multiverseco.org/.well-known/apple-app-site-association`
   → `200` + `content-type: application/json`, no redirect.
4. **Supabase email template (the load-bearing step).** Universal Links do **not**
   fire on the `*.supabase.co` redirect that `inviteUserByEmail` sends. In the
   Supabase dashboard → *Authentication → Email Templates → Invite user*, point
   the link at our domain so it's tapped directly:

   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/register">Accept your invitation</a>
   ```

   (`/auth/callback` already handles `token_hash` + `type`, so web is unaffected.)
   ⚠️ This is **production** Supabase shared with the website — change the
   template, send yourself a test invite, confirm web still works.
5. **Android (later).** Set `ANDROID_CERT_SHA256` (release/Play signing cert
   fingerprint) in prod so `assetlinks.json` is non-empty. Needs Android Studio +
   a signing key first.

### Verify (iOS)

After 1–4 and a deploy: on the device, submit `/new` with a test email → open
the invite email in **Mail** → tapping the link should open the **app** (not
Safari) → `/auth/callback` → `/register`. Session should survive killing and
reopening the app.

## Other follow-ups before this is shippable

1. **Payments / App Store compliance (highest risk).** The $12 Initial Voyager
   Pack is a *physical* shipped item (≈4-week fulfilment) — physical goods are
   exempt from Apple/Google in-app-purchase rules and may use Stripe. But the
   purchase also unlocks Voyager membership, which a reviewer could read as a
   *digital* entitlement and reject. Mitigations: keep the purchase framed and
   described as the physical pack; open Stripe Checkout in the **system browser**
   (not the in-app WebView) via `@capacitor/browser`. Resolve this *before*
   submitting — it can block the whole release.

2. **Safe areas / status bar.** Add `@capacitor/status-bar` and verify notch /
   home-indicator insets on a real phone (the app is portrait-first already, so
   this is polish, not a rebuild).

3. **External links.** Make outbound links (email, social) open in the system
   browser, not navigate the shell.

4. **Push notifications (optional, likely wanted).** Today reminders are email +
   the `signal-recall` cron. To go native: `@capacitor/push-notifications` +
   APNs/FCM + store device tokens in Supabase + send from the server. ~1 week.

5. **Store assets.** App icons + splash **done** (`@capacitor/assets` from
   `assets/icon.png`; re-run after replacing the source with a crisp 1024²).
   Still needed: iOS Privacy Manifest, listing copy + screenshots.

## Config reference

`capacitor.config.json` at the repo root:

- `appId` — `org.multiverseco.app` (the iOS bundle ID / Android package; hard to
  change after first store submission — confirm before shipping).
- `appName` — `Multiverse Collective` (home-screen label; shorten if it clips).
- `server.url` — the live site the shell loads.
- `server.allowNavigation` — domains the WebView may navigate to in-app
  (Supabase, Stripe). Everything else should open externally.
