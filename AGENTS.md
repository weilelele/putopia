<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design & UX

`docs/design-system.md` is the authoritative design spec (palette, type scale,
tokens, component conventions) — read it before touching UI. Two load-bearing
rules to keep front of mind:

- **Portrait-first is the default.** ~90% of users arrive on a phone in
  portrait, so portrait mobile is the primary design/build/verify target —
  widescreen/landscape is progressive enhancement, not the other way around.
  Lean on Tailwind's mobile-first model: base (unprefixed) classes = portrait
  phone, add `sm:`/`md:`/`lg:` only to *enhance* for wider screens. Verify at a
  narrow viewport (~390×844, ideally the branch preview on a real phone) before
  checking desktop. Full guidance in `docs/design-system.md` §3.
- **Type scale floor.** `--fs-caption` (12px) is the smallest permitted size;
  never hard-code a smaller inline `fontSize`. `design-tokens/min-font-size`
  flags it.

# Deployments & preview environments

`main` is the production trunk. Work happens on `feat/*` (human), `claude/*`
(Claude), or `codex/*` (Codex) branches, opened as a PR and **squash-merged** into `main`. Delete the
branch after merge — squash-merged branches still report as "ahead" of `main`
and look unmerged.

## Production deployment guardrails

- Start every task in a new worktree created directly from the latest
  `origin/main`. Never create a task branch from another feature branch or
  reuse a dirty worktree from a different task.
- Before pushing or opening a PR, run `npm run verify:branch` and review the
  complete commit and file list it prints. Unexpected files are a blocker.
- Normal production releases happen only through an approved PR merged into
  `main`, followed by the Vercel Git integration. Agents must not run
  `vercel --prod`, `vercel deploy --prod`, `vercel promote`, reassign a
  production domain, or otherwise bypass the Git/PR path.
- The only exception is an incident rollback explicitly requested by the user.
  Before a rollback, identify the exact previously verified production
  deployment and confirm its Git commit does not contain the offending change.
- Never deploy from a dirty worktree. For any exceptional manual production
  operation, `npm run verify:production-source` must pass first unless the
  operation is the verified rollback exception above.
- A preview is never promoted merely because it builds or its local task is
  complete. Promotion requires an explicit user instruction naming the release
  intent after the preview has been reviewed.

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
  `npm test`, and `next build`. The tree is lint-error-clean; the
  React-compiler correctness rules are enforced as **errors** (intentional
  exceptions carry inline `eslint-disable … -- reason` comments), and
  `design-tokens/min-font-size` (the 12px type-scale floor) is tracked as a
  warning — see `eslint.config.mjs`. Before pushing, run `npx tsc --noEmit`,
  `npm run lint`, `npm test`, `npm run build`, and `npm run verify:branch`
  locally.
- Tests run on **Vitest** (`*.test.ts` next to the code, `node` env — see
  `vitest.config.ts`). Keep them pure: no DOM, DB, network, or env. Previews
  share production services, so a test must never touch them.
