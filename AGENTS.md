<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design & UX

`docs/design-system.md` is the authoritative design spec (palette, type scale,
tokens, component conventions) — read it before touching UI. Three load-bearing
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
- **One visual language.** New UI uses only orange, deep-space blue, and
  off-white brand colors; Courier Prime; flat surfaces; and at most one clipped
  top-right corner on a prominent control or container. Do not add cyan, grey
  brand colors, gradients, glow/shadows, blur/glass, CRT effects, or decorative
  HUD elements. Run `npm run design:check` before requesting review.

# Deployments & preview environments

`main` is the production trunk. Work happens on `feat/*` (human), `claude/*`
(Claude), or `codex/*` (Codex) branches, opened as a PR and **squash-merged**
into `main`. Delete the branch after merge — squash-merged branches still
report as "ahead" of `main` and look unmerged.

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
- `.codex/environments/environment.toml` runs `npm install` when the Codex
  desktop app creates a worktree, so fresh worktrees have the same dependencies.
- A PostToolUse hook auto-fixes edited TS/TSX and blocks on any remaining
  ESLint error.
- CI (`.github/workflows/ci.yml`) gates PRs on `tsc --noEmit`, `npm run lint`,
  `npm test`, and `next build`. The tree is lint-error-clean; the
  React-compiler correctness rules are enforced as **errors** (intentional
  exceptions carry inline `eslint-disable … -- reason` comments), and
  `design-tokens/min-font-size` (the 12px type-scale floor) is tracked as a
  warning — see `eslint.config.mjs`. The diff-aware `npm run design:check` gate
  rejects prohibited visual treatments in newly added UI lines without making
  legacy debt block unrelated work. Before pushing, run `npm run design:check`,
  `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` locally.
- Tests run on **Vitest** (`*.test.ts` next to the code, `node` env — see
  `vitest.config.ts`). Keep them pure: no DOM, DB, network, or env. Previews
  share production services, so a test must never touch them.
