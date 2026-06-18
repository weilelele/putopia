# 12 · Admin & Operations

## 1. Positioning

The admin area (`/admin/*`, architect only) is the game's **"game master / level editor"** — almost
all "content" and "progression" is driven by Architects manually: authoring puzzles, reviewing,
publishing, CRUD, shipping, impersonation. Understanding admin = understanding *who runs this game
behind the scenes and at what cadence content is fed*.

## 2. Admin tooling

| Route | Function | System |
|---|---|---|
| `/admin` | admin home/entry | — |
| `/admin/signal-tasks` | authoring puzzles: create investigation→add day→Cosmo sourcing→curate→publish | 03 |
| `/admin/worlds` | world CRUD (colors/gradient/lifecycle transitions) | 02 |
| `/admin/votes` | poll CRUD | 04 |
| `/admin/intel` | intel CRUD (public/classified) | 05 |
| `/admin/create-news` | AI-assisted intel draft generation | 05 |
| `/admin/stories` | log review (publish/unpublish/edit/delete) | 06 |
| `/admin/devices` | device CRUD + images + assignment (=voyager upgrade) | 07 |
| `/admin/mc-config` | console function-panel config | 08 |
| `/admin/voyagers` | member management (incl. manual upgrade) | 01 |
| `/admin/orders` | order fulfillment: tracking entry, status advance, manual orders | 10 |
| `/admin/quiz` | applicant quiz bank CRUD (with answers, server-side scoring) | 01 |
| `/admin/onboarding-preview` | landing copy/variant editing & preview | 11 |
| `/admin/activity` | activity/feed management | 09 |
| `/admin/analytics` | analytics & ops dashboards | — |

## 3. Key operational capabilities

- **Impersonation**: an Architect can "POST AS" any voyager/architect to comment, sustaining community
  vibe (the real operator is recorded in the hidden `posted_by_id`).
- **Manual upgrade**: `provisionVoyagerByEmail` (upgrade by email), or approving an application=approved.
- **Manual order/shipping**: `createOrderManually` (offline/gift/testing); entering carrier+tracking drives tracking email.
- **AI assist**: intel draft generation (`news-gen.ts`).
- **Quiz scoring**: `answer_key` is never sent to the client; server-side `submitQuizAnswers` scores it
  (pass_mark=4); passing stamps `task_quiz_at`.

## 4. Quiz system detail

The quiz carries Applicant Task 02 (page `/quiz`):

- `quiz_questions`: prompt + options(jsonb) + answer_key (server only); default bank `applicant-baseline-v1`.
- Player answers → server scores → ≥4 correct = passed → stamps `task_quiz_at` (idempotent).
- Full admin CRUD + drag reorder.

## 5. Permission model

- `/admin/*` and `/profile` are protected at the route level by `proxy.ts` (the renamed Next.js 16 middleware): admin requires architect.
- Content writes generally go through the **service_role (admin client)**, bypassing RLS; reads are tiered by RLS.
- Exception: `can_edit_onboarding` is a page-level grant letting a non-architect edit the landing onboarding.

## 6. Current status & gaps

- ✅ Per-module admin tools, impersonation, manual upgrade/order, AI drafts, quiz scoring are live.
- 🟡 Admin relies heavily on manual cadence (signal puzzles are fully hand-authored) — ops cost is a core constraint.
- ⬜ No unified "ops dashboard" (cross-module todo/health/conversion overview); analytics are scattered across `/admin/analytics` + PostHog.

## 7. Future hooks

- Ops dashboard: tuning worlds awaiting a puzzle, logs awaiting review, orders awaiting shipment, funnel conversion — all on one screen.
- Semi-automated authoring (improve Cosmo-sourcing efficiency while keeping human curation).
- Audit & rollback of ops actions (impersonation, upgrades, refunds fully traceable).
