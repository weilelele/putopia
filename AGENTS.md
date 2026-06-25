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

# Cross-platform (web + iOS app + Android PWA)

This is **one Next.js site loaded three ways** — a browser tab (`web`), a
Capacitor WKWebView (`ios-native`, loads `server.url`), and an installed PWA
(`android-pwa`). ~99% of the code is shared; only a narrow boundary diverges.

- **Branch on capabilities, never on the platform name.** All runtime detection
  lives in `src/lib/platform.ts` (the single source of truth). Feature code reads
  capabilities — `platform.canNativePush`, `platform.storePaymentRestricted`,
  `platform.isStandalone`, … — via `usePlatform()` (client) or `getPlatform()`
  (effects / non-React). Write `if (platform.canNativePush)`, not `if (isIOS)`.
- Raw `window.Capacitor`, `navigator.standalone`, and display-mode media queries
  in `src/app` / `src/components` are **blocked** by the ESLint rule
  `platform/no-raw-platform-check`. Add new platform branches to `platform.ts`,
  not inline.
- Every capability needs a **graceful web fallback** so the worst case is a
  normal working website. End `switch (platform.runtime)` blocks with
  `assertNever()` for exhaustiveness.
- The full divergence registry + verification matrix is in
  `docs/cross-platform.md` — consult it before touching push, auth return,
  payment, safe-area, external links, or the update flow.

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
  `npm test`, and `next build`. The tree is lint-error-clean; the
  React-compiler correctness rules are enforced as **errors** (intentional
  exceptions carry inline `eslint-disable … -- reason` comments), and
  `design-tokens/min-font-size` (the 12px type-scale floor) is tracked as a
  warning — see `eslint.config.mjs`. Before pushing, run `npx tsc --noEmit`,
  `npm run lint`, `npm test`, and `npm run build` locally.
- Tests run on **Vitest** (`*.test.ts` next to the code, `node` env — see
  `vitest.config.ts`). Keep them pure: no DOM, DB, network, or env. Previews
  share production services, so a test must never touch them.
