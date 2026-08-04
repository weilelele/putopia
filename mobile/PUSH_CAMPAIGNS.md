# Code-driven personalized push campaigns

This is the operator workflow for manually sending native iOS notifications. It uses the existing APNs delivery path, Supabase device records, notification preferences, and delivery logs. It does not add an in-app message or a third-party messaging vendor.

## One-time production setup

1. Complete the APNs setup in `mobile/PUSH_NOTIFICATIONS.md`.
2. Apply `supabase/schema_v58.sql` after `schema_v57.sql`.
3. Generate a long random `PUSH_CAMPAIGN_SECRET` and add it to Vercel Production as an encrypted environment variable.
4. Give the same secret only to the engineers authorized to send campaigns. Store it in their local `.env.local`; never paste it into chat, GitHub, screenshots, or the mobile app.
5. Redeploy after the schema and environment variable are ready.

Optional local setting:

```dotenv
PUSH_CAMPAIGN_API_URL=https://multiverseco.org
PUSH_CAMPAIGN_SECRET=<stored locally; never commit>
PUSH_CAMPAIGN_OPERATOR=<your name or work email>
```

## Campaign file

Copy `scripts/fixtures/push-campaign.example.json` and give every send a new `campaignKey`. A key can be used for only one campaign.

Built-in personalization variables:

- `{{display_name}}`
- `{{first_name}}`
- `{{role}}`
- `{{location}}`
- `{{batch_label}}`
- `{{user_id}}`

Campaign-wide values such as `world_name` and `world_id` belong in the JSON `variables` object. Email is deliberately unavailable because lock-screen notifications should not expose it.

Audience options:

```json
{ "type": "all" }
```

```json
{ "type": "roles", "roles": ["voyager", "architect"] }
```

```json
{ "type": "users", "userIds": ["profile-uuid"] }
```

Only registered users with an enabled iOS device are eligible.

## Required sending sequence

### 1. Preview — never sends

```bash
npm run push:campaign -- preview path/to/campaign.json
```

Review the eligible count, five personalized samples, copy length, and deep link.

### 2. Send one real test

```bash
npm run push:campaign -- test path/to/campaign.json --user=<test-profile-uuid>
```

The test profile must have logged into the TestFlight app and allowed notifications. Open the notification on the physical iPhone and verify its destination. A successful test is recorded for 24 hours.

### 3. Confirm and send

```bash
npm run push:campaign -- send path/to/campaign.json --confirm=<campaignKey>
```

The server rejects a send if the copy changed after testing, the test is older than 24 hours, or the confirmation does not exactly match the campaign key. Recipients are rendered once, placed in a server-owned queue, and delivered in batches. User notification preferences are respected.

### 4. Resume or inspect

If the terminal or network closes during delivery, the queue remains in Supabase:

```bash
npm run push:campaign -- resume <campaignKey>
npm run push:campaign -- status <campaignKey>
```

The database records the operator label, final personalized copy, and sent, failed, and skipped totals. Interrupted recipient claims become eligible for retry after ten minutes.

## Safety boundaries

- The API accepts only an authenticated Architect session or the dedicated campaign secret.
- A campaign cannot send until the identical copy has reached a physical test device.
- Title is capped at 100 rendered characters; body at 240.
- Deep links must be internal paths beginning with one `/`.
- The tool never targets users without an enabled iOS device.
- Do not include confidential or sensitive personal data in lock-screen copy.
- Use a new campaign key to correct and resend a completed campaign.
