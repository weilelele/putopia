# iOS push rollout

The app uses the native iOS notification permission alert after the member signs in. There is no custom in-app notification prompt. Authentication and account-recovery emails are unchanged.

## One-time setup

1. Apply `supabase/schema_v57.sql` to the production Supabase project.
2. In Apple Developer, enable Push Notifications for `org.multiverseco.collective`.
3. Create an APNs authentication key and keep the downloaded `.p8` file outside the repository.
4. Add these encrypted server environment variables in Vercel:
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_PRIVATE_KEY` (the complete `.p8` contents)
   - `APNS_TOPIC=org.multiverseco.collective`
5. Deploy the web/server changes before uploading iOS build 3.

Build configuration is intentionally split: local Debug builds use Apple's sandbox push
service, while Release/TestFlight builds use the production push service. Do not change
the Release entitlement back to `development`.

No Apple credential or Supabase service key belongs in the mobile app, GitHub, or App Store metadata.

## Acceptance check

1. Install build 3 from TestFlight and sign in.
2. Allow the native iOS notification permission alert.
3. Confirm `GET /api/push/device` returns `authenticated: true` and `deviceCount: 1`.
4. While signed in as an Architect, send `POST /api/push/test` from the same authenticated session.
5. Confirm the response contains `attempted: 1` and `delivered: 1`.
6. Confirm the notification appears and opens the Console when tapped.
7. Verify a reply, world confirmation, failed scan, and Signal recall prefer push; a member without a registered iPhone still receives the existing email fallback.
8. Sign out and confirm that the previous account no longer receives notifications on that device.

The test endpoint now returns an actionable `message` and `nextStep`. In particular:

- `PUSH_STORAGE_UNAVAILABLE`: apply `supabase/schema_v57.sql`.
- `No iPhone is registered`: open build 3, sign in, allow notifications, and retry.
- `Apple rejected`: confirm Release signing has the production APNs entitlement and inspect `push_delivery_log`.

The simulator fixture at `mobile/test-fixtures/notification.apns` verifies notification appearance and routing without Apple credentials. Real APNs delivery must be accepted on a signed physical iPhone/TestFlight build.
