# TestFlight Team Handoff

## Package identity

- App name: `Multiverse Collective`
- Bundle ID: `org.multiverseco.collective`
- Version: `1.0.0`
- Build: `5`
- Website entry: `https://www.multiverseco.org/console?source=ios_app`

The iOS app is a WKWebView shell over the production website. The website remains
the source of truth for UI, authentication, permissions and data. The package
contains no Supabase secret, service-role key or private environment file.

## Prepare the project

From the unpacked package:

```bash
cd mobile
npm ci
npm run check
cd ios
pod install
open MultiverseCollective.xcworkspace
```

Always open the `.xcworkspace`, not the `.xcodeproj`.

## Sign and upload

1. Select the `MultiverseCollective` target in Xcode.
2. Open **Signing & Capabilities** and enable **Automatically manage signing**.
3. Select the organization's Apple Developer Team.
4. Confirm that `org.multiverseco.collective` is available to that Team. If the
   organization already registered another Bundle ID, update both Xcode and
   `mobile/app.json` before archiving.
5. Select **Any iOS Device (arm64)** as the run destination.
6. Choose **Product → Archive**.
7. In Organizer, choose **Distribute App → App Store Connect → Upload**.
8. In App Store Connect, wait for processing, complete export-compliance and
   privacy questions, then add the build to a TestFlight testing group.

Increment the build number before every later upload. App Store Connect will not
accept the same version/build pair twice.

Do not commit the selected Apple Team, provisioning profile, certificates,
archives, exported `.ipa` files or `.xcode.env.local`. They belong to the
release operator and Apple Developer account, not to source control.

## Team acceptance checks

- Correct Multiverse Collective icon and launch screen.
- App opens the production Console without a browser address bar.
- Login succeeds and remains active after force-closing and reopening.
- Dashboard, Intel, Devices, Worlds and Voyagers open normally.
- Forms, uploads and external `mailto:`/`tel:` links behave as expected.
- Network loss preserves the primary app navigation and last synchronized read-only content.
- Credentials, classified Intel, comments, drafts, and individual vote responses are not stored.
- Restoring the network automatically reloads the previous Console channel.

## Review preparation

Provide App Review with a working demo account if authenticated content is
required to evaluate the app. The App Store privacy answers and privacy policy
must describe the account, profile and user-content data handled by the website.
A website-only wrapper may receive a minimum-functionality review objection;
TestFlight upload does not guarantee public App Store approval.
