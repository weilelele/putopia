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
5. Deploy the web/server changes before uploading iOS build 2.

No Apple credential or Supabase service key belongs in the mobile app, GitHub, or App Store metadata.

## Acceptance check

1. Install build 2 from TestFlight and sign in.
2. Allow the native iOS notification permission alert.
3. While signed in as an Architect, send `POST /api/push/test` from the same authenticated session.
4. Confirm the notification appears and opens the Console when tapped.
5. Verify a reply, world confirmation, failed scan, and Signal recall prefer push; a member without a registered iPhone still receives the existing email fallback.
6. Sign out and confirm that the previous account no longer receives notifications on that device.

The simulator fixture at `mobile/test-fixtures/notification.apns` verifies notification appearance and routing without Apple credentials. Real APNs delivery must be accepted on a signed physical iPhone/TestFlight build.
