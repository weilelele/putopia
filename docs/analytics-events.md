# Analytics events (PostHog)

All product analytics flow through **PostHog** via `posthog.capture(...)`. Client
events are fired from `'use client'` components with `import posthog from
'posthog-js'`; a few server actions capture with an explicit `distinctId`.

This file is the canonical inventory of custom events. Keep it in sync when you
add, rename, or remove a `posthog.capture(...)` call. Regenerate the raw list
any time with:

```sh
grep -rno "posthog.capture([^)]*" src/
```

---

## Path Status Bar (console HUD strip)

The logged-in dashboard strip rendered by
[`src/components/path-status-bar.tsx`](../src/components/path-status-bar.tsx).
All four events carry `role` (`architect` | `applicant` | `voyager`) so the
strip's behaviour can be segmented by user type.

| Event | Trigger | Properties |
|-------|---------|------------|
| `pathbar_avatar_clicked` | Avatar tapped → `/profile` | `role` |
| `pathbar_view_path_clicked` | "VIEW YOUR PATH" tapped → `/voyager-path` | `role` |
| `pathbar_signal_clicked` | "SIGNAL DISPATCH" tapped → `/signal` | `role`, `awaiting_you` (backlog count at click time) |
| `pathbar_device_clicked` | Camera / DAYS tapped → opens device modal | `role`, `has_device`, `device_days` |

---

## Console / workspace

[`src/app/console/page.tsx`](../src/app/console/page.tsx)

| Event | Trigger | Properties |
|-------|---------|------------|
| `console_page_viewed` | Console page mount | (see source) |
| `workspace_request_access_clicked` | "REQUEST ACCESS" CTA | — |
| `workspace_login_clicked` | "LOGIN" CTA | — |
| `ask_us_clicked` | "ASK US" architect contact link | `architect`, `x_handle` |

## Content views

| Event | Source | Properties |
|-------|--------|------------|
| `intel_viewed` | [`intel/[id]/page.tsx`](../src/app/intel/[id]/page.tsx) | `intel_id`, `intel_tag`, `intel_title` |
| `intel_read_complete` | `intel/[id]/page.tsx` | `intel_id` |
| `world_viewed` | [`worlds/[id]/page.tsx`](../src/app/worlds/[id]/page.tsx) | `world_id`, `world_name` |
| `log_viewed` | [`logs/[id]/page.tsx`](../src/app/logs/[id]/page.tsx) | `story_id`, `story_title`, `story_tags` |
| `log_comment_sent` | `logs/[id]/page.tsx` | `story_id`, `story_title` |
| `device_viewed` | [`devices/[id]/page.tsx`](../src/app/devices/[id]/page.tsx) | `device_id`, `device_knowledge` |
| `voyager_pack_viewed` | [`voyager-pack/pack-view-tracker.tsx`](../src/app/voyager-pack/pack-view-tracker.tsx) | `experiment_group`, `cta_state` |

## Onboarding & acquisition

| Event | Source | Properties |
|-------|--------|------------|
| `onboarding_started` | [`new/onboarding-client.tsx`](../src/app/new/onboarding-client.tsx) | (see source) |
| `onboarding_q1_completed` | `new/onboarding-client.tsx` | `belief_value`, `onboarding_version` |
| `onboarding_q2_completed` | `new/onboarding-client.tsx` | `world_selected`, `onboarding_version` |
| `onboarding_slider_touched` | `new/onboarding-client.tsx` | `initial_value`, `onboarding_version` |
| `waitlist_submitted` | `new/onboarding-client.tsx`, [`demo/page.tsx`](../src/app/demo/page.tsx) | (see source) |
| `application_submitted` | [`apply/page.tsx`](../src/app/apply/page.tsx) | (see source) |
| `account_registered` | [`register/page.tsx`](../src/app/register/page.tsx) | (see source) |

## Auth

| Event | Source | Properties |
|-------|--------|------------|
| `user_logged_in` | [`login/page.tsx`](../src/app/login/page.tsx) | `email` |
| `login_failed` | `login/page.tsx` | `error` |

## Engagement (comments / votes / submissions)

| Event | Source | Properties |
|-------|--------|------------|
| `<posthogEvent>` (per-thread, prop-driven) | [`comment-thread.tsx`](../src/components/comment-thread.tsx) | `subject_type`, `subject_id`, `is_reply`, `has_images` |
| `story_submitted` | [`lib/actions/stories.ts`](../src/lib/actions/stories.ts) (server) | `story_id`, `title` |
| `vote_response_submitted` | [`lib/actions/votes.ts`](../src/lib/actions/votes.ts) (server) | `vote_id`, `selected_options` |
| `application_reviewed` | [`lib/actions/applications.ts`](../src/lib/actions/applications.ts) (server) | `application_id`, `status` |

## Automatic

| Event | Source | Notes |
|-------|--------|-------|
| `$pageview` | [`instrumentation-client.ts`](../src/instrumentation-client.ts) | Fired on every route change |
| `section_viewed` | [`section-tracker.tsx`](../src/components/section-tracker.tsx) | `section` — section impression |

---

## Viewing overall click activity in PostHog

The path-bar events all share the `pathbar_` prefix, so the whole strip can be
analysed as one group.

- **Total clicks per button** — Insight → Trends, add each `pathbar_*` event,
  display as a bar chart (total count). Add a breakdown by `role` to split by
  user type.
- **Strip engagement over time** — same Trends insight, switch to a line chart
  to watch daily clicks.
- **Where the strip leads** — funnel from a `pathbar_*` click to the
  destination's view event (e.g. `pathbar_signal_clicked` → the `/signal`
  `$pageview`) to see follow-through.
- **Backlog vs. click-through** — on `pathbar_signal_clicked`, break down by
  `awaiting_you` to test whether a larger backlog drives more clicks.

Events only appear in PostHog after the change is deployed and a real user
triggers them; the first capture auto-registers the event name.
