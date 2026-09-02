# Device / Worlds main integration

## Scope

Integrates `codex/world-production-workflow` at `cd3148c` with production main
at `7970f2b`. Preserves main's iOS shell, push notifications, offline fixes,
design gate, and the local Worldflow route (no external Worldflow rewrite).
Retains the branch's updated investor briefing and Device / Worlds features.

## Database migration collision

Main and the Device branch independently used `schema_v57.sql` and
`schema_v58.sql` for different features. Main's versioned iOS migration files
remain byte-for-byte unchanged. The Device order, follow, and email-log
prerequisites are preserved together in the new `schema_v68.sql`.

The numbered SQL files are manual runbooks, not automatically executed by
Vercel or Supabase CLI. Do not blindly apply them in filename order.

- Main-only database: verify existing migrations, apply the Device prerequisites
  in `schema_v68.sql`, then apply missing Device migrations v59 through v67 in
  order. v59 depends on the Device order columns in v68.
- Database already running the Device branch: inspect the existing schema and
  apply only missing changes. Do not replay v68 over later Device migrations:
  later migrations may refine indexes, statuses, or email-log constraints.
- References to Device v57/v58 in historical documents mean the prerequisites
  now preserved in v68, not main's iOS push migrations.
- Timestamped migrations in `supabase/migrations` are separate; verify their
  history before applying any missing ones.

Production application status: **not verified; no database migration was run
as part of this integration**. Confirm the actual schema before opening paid
claims or assuming Dreamcatcher processing is ready.

## Deployment boundary

The previous Preview used temporary disabled Cron registration. The committed
`vercel.json` retains production schedules. Vercel Hobby rejected the
every-minute Dreamcatcher and every-ten-minute story schedules. Merging main
does not resolve that restriction or mean that production is released.
Do not promote the no-Cron Preview to production as a workaround.

Before releasing, resolve the scheduler limitation, verify production config
and migration state, and validate checkout/webhook behavior without live test
charges against the shared production services.
