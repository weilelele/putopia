# Supabase Setup Guide

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `putopia`, choose a region close to your users
3. Set a strong database password and save it

## 2. Run the schema

1. In your project dashboard → **SQL Editor** → **New Query**
2. Paste the contents of `supabase/schema.sql` and click **Run**
3. Then paste and run `supabase/seed.sql` to load demo votes

## 3. Configure environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your values from **Settings → API**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g. `https://abc.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

## 4. Enable Email Auth

**Authentication → Providers → Email** — enable it.

For production, configure a custom SMTP provider under **Auth → SMTP Settings**.

## 5. Set up Storage (avatars)

The schema creates the `avatars` bucket automatically. If it doesn't appear:

1. **Storage** → **New Bucket** → name: `avatars`, set to **Public**
2. Re-run only the storage section of `schema.sql`

## 6. Start the dev server

```bash
npm run dev
```

## User roles

| Role | Access |
|---|---|
| `guest` | Homepage, public votes, apply form |
| `applicant` | + applicant-scoped votes, own application status |
| `voyager` | + voyager directory, devices, expedition logs, stories |
| `architect` | + all votes, application management, system admin |

To promote a user to `architect` (first-time setup):

```sql
UPDATE voyager_profiles SET role = 'architect' WHERE id = '<user-uuid>';
```

Find the UUID in **Authentication → Users**.

## Architecture overview

```
src/
  lib/
    supabase/
      client.ts        # Browser-side Supabase client
      server.ts        # Server-side client + admin client
    actions/
      auth.ts          # Sign in / sign up / sign out
      profile.ts       # Read/update voyager profile, avatar upload
      votes.ts         # List votes, submit responses, tally results
      applications.ts  # Submit application, review (architect)
  middleware.ts        # Auth session refresh + route protection
  types/
    database.ts        # TypeScript types for all tables

supabase/
  schema.sql           # Tables, enums, RLS policies, triggers
  seed.sql             # Demo votes
```
