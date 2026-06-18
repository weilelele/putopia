<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployments & preview environments

`main` is the production trunk. Work happens on `feat/*` (human) or `claude/*`
(agent) branches, opened as a PR and **squash-merged** into `main`. Delete the
branch after merge — squash-merged branches still report as "ahead" of `main`
and look unmerged.

Every branch/PR gets its own **preview deployment** (Vercel/Netlify) — you do
not need to merge to `main` to see a change live. Production crons are defined
in `vercel.json`, so Vercel is the production host.

**Preview ≠ a safe sandbox.** Unless a preview-scoped env is configured, preview
deployments share **production** Supabase, MongoDB, and Stripe. Therefore:

- Treat any write from a preview (checkout, webhook, profile/role change,
  onboarding edits) as writing to **production data**.
- Never run destructive or bulk operations (`supabase db reset`, mass updates,
  test charges against live Stripe keys) from a preview or local session pointed
  at the shared env.
- Schema changes: add a new `supabase/schema_vN.sql` migration; never edit an
  existing versioned file. Note in the PR whether the migration has been applied
  to the production database.

# Verification harness

- `.claude/hooks/session-start.sh` runs `npm install` on web sessions so
  `node_modules/` (and the Next.js docs above) are available.
- A PostToolUse hook auto-fixes edited TS/TSX and blocks on any remaining
  ESLint error.
- CI (`.github/workflows/ci.yml`) gates PRs on `tsc --noEmit`, `npm run lint`,
  `npm test`, and `next build`. The tree is lint-error-clean; a handful of
  React-compiler rules are tracked as warnings in `eslint.config.mjs` (see the
  comment there). Before pushing, run `npx tsc --noEmit`, `npm run lint`,
  `npm test`, and `npm run build` locally.
- Tests run on **Vitest** (`*.test.ts` next to the code, `node` env — see
  `vitest.config.ts`). Keep them pure: no DOM, DB, network, or env. Previews
  share production services, so a test must never touch them.
