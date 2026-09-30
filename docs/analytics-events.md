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

## Android PWA

| Event | Trigger | Properties |
|-------|---------|------------|
| `pwa_install_available` | Android browser exposes the native install prompt | — |
| `pwa_install_clicked` | User taps the Console install card | — |
| `pwa_install_accepted` | User accepts the native install prompt | `platform` |
| `pwa_install_dismissed` | User dismisses the native install prompt | `platform` |
| `pwa_installed` | Browser reports installation completed | — |
| `pwa_standalone_launched` | App opens in standalone display mode | — |
| `pwa_offline_viewed` | Connectivity returns after the offline fallback was shown | `offline_viewed_at` |

---

## Device pages (`/devices/**`)

Every Device event is prefixed `device_` so the whole chain filters with one
query. Client events come from [`src/lib/device-analytics.ts`](../src/lib/device-analytics.ts)
(`trackDevice`, errors swallowed); server events come from
[`src/lib/device-analytics-server.ts`](../src/lib/device-analytics-server.ts)
with `distinctId = user.id`. Client events record what the browser **attempted**;
server events record what **actually happened**. `batch_slug` is on nearly every
event and is the default funnel breakdown.

### Page views

| Event | Source | Properties |
|-------|--------|------------|
| `device_room_viewed` | `live/device-live-room.tsx`; fires on mount and on every batch switch | `batch_slug`, `batch_status`, `claim_state` (`open` \| `owned` \| `sold_out` \| `closed`), `active_tab` (the tab already showing, restored per batch from the session), `surface` (`devices_index` \| `batch_detail`) |
| `device_claim_page_viewed` | `_components/device-claim-client.tsx` | `batch_slug`, `batch_status`, `logged_in`, `applicant`, `checkout_cancelled` |
| `device_claim_success_viewed` | `claim/success/page.tsx`; refires when a pending order becomes confirmed | `batch_slug`, `order_status`, `confirmed`, `pending` |
| `device_my_consoles_viewed` | `my-consoles/page.tsx` | `owned_count` |
| `device_discussion_page_viewed` | `batches/[slug]/discussion/page.tsx` | `batch_slug`, `can_post`, `post_count` |

### Interaction (client)

| Event | Trigger | Properties |
|-------|---------|------------|
| `device_batch_selected` | Batch tab or list row chosen | `from_batch_slug`, `batch_slug`, `via` (`tab` \| `sheet`) |
| `device_batch_list_opened` / `device_batch_filter_changed` | All-batches sheet / its filter | `batch_slug` / `filter` |
| `device_tab_changed` | Switch to another INFO / UPDATES / DISCUSSION tab; re-clicking the open tab is ignored | `batch_slug`, `tab`, `from_tab` |
| `device_gallery_item_selected` | Gallery thumbnail (live camera or image/video) | `batch_slug`, `media_index` (-1 = live camera), `media_kind` (`image` \| `video` \| `live_camera`), `media_caption`, `media_src`, `from_index`, `position` |
| `device_video_played` | Video started in gallery or material records | `batch_slug`, `media_*` (as above), `surface` (`gallery` \| `material_records`) |
| `device_media_record_seen` | A material-record image/video scrolled ≥60% into view (once per mount) | `batch_slug`, `media_*` |
| `device_room_dwell` | Visible seconds on one batch; sent on batch switch, tab hide, or leave. Use instead of `$pageleave` duration, which lumps pushState batch switches into one page | `batch_slug`, `seconds_visible` |
| `device_faq_opened` | FAQ item expanded | `batch_slug`, `question` |
| `device_packages_opened` | VIEW PACKAGES | `batch_slug`, `package_count` |
| `device_field_lead_opened` | Field lead sheet | `lead_name` |
| `device_purchase_details_opened` / `device_order_support_clicked` | Purchase details sheet / support mailto | `batch_slug`, `location` |
| `device_progress_opened` / `device_unit_record_opened` | CHECK MY PROGRESS / OPEN FULL UNIT RECORD | `batch_slug` |
| `device_follow_clicked` / `device_follow_failed` | FOLLOW toggle / its error | `batch_slug`, `next_followed`, `logged_in` / `error` |
| `device_discussion_post_submitted` / `device_discussion_post_failed` | Composer submit / failure | `batch_slug`, `has_image`, `length` / `stage` (`upload` \| `post`), `error` |

### Conversion chain

| Event | Source | Properties |
|-------|--------|------------|
| `device_claim_cta_clicked` | CLAIM A CONSOLE in the room | `batch_slug`, `location`, `price`, `remaining` |
| `device_claim_button_clicked` | Claim page button | `batch_slug`, `price`, `currency`, `state` (`login_required` \| `apply_required` \| `checkout`) |
| `device_checkout_result` | **server**, `api/device-checkout` — every attempt, every branch | `batch_slug`, `outcome` (`session_created` \| `session_reused` \| `failed`), `status`, `error` |
| `device_checkout_redirected` | Claim page, Stripe URL received, about to leave | `batch_slug`, `price`, `currency` |
| `device_checkout_failed` | Claim page, checkout rejected | `batch_slug`, `reason`, `status` |
| `device_follow_saved` / `device_follow_error` | **server**, `setMyDeviceBatchFollow` | `batch_slug`, `followed`, `error` |
| `device_discussion_posted` / `device_discussion_post_error` | **server**, `postDeviceBatchDiscussion` | `batch_slug`, `image_count`, `error` |

### Funnels to build in PostHog

Create these as Insights → Funnels, conversion window 7 days (Stripe round
trips and login detours are slow), **breakdown by `batch_slug`**. Client and
server steps join on `user.id`: the browser is `identify`-ed at login/register,
so pre-login steps merge into the same person.

1. **Console claim (primary)**
   1. `device_room_viewed` where `claim_state = open`
   2. `device_claim_cta_clicked`
   3. `device_claim_page_viewed`
   4. `device_claim_button_clicked` where `state = checkout`
   5. `device_checkout_result` where `outcome` ≠ `failed`
   6. `device_checkout_redirected`
   7. `device_claim_success_viewed` where `confirmed = true`

   Read drop-offs as: 2→3 room CTA leakage, 3→4 price/terms hesitation,
   4→5 server rejection (break down step 5's failures by `error`),
   6→7 Stripe abandonment. Ground truth for revenue stays in `voyager_orders`;
   the commerce metrics sync (#201) already reports paid orders.
2. **Claim gate** — `device_claim_page_viewed` → `device_claim_button_clicked`
   where `state` is `login_required` or `apply_required` → `device_claim_page_viewed`
   where `logged_in = true` (measures how many visitors survive the login/apply detour).
3. **Follow** — `device_room_viewed` → `device_follow_clicked` → `device_follow_saved`.
4. **Discussion** — `device_tab_changed` where `tab = discussion` →
   `device_discussion_post_submitted` → `device_discussion_posted`.
5. **Post-purchase** — `device_claim_success_viewed` where `confirmed = true` →
   `device_my_consoles_viewed` → `device_progress_opened`.

Checkout failure reasons, as a HogQL insight:

```sql
SELECT properties.batch_slug AS batch, properties.status AS status,
       properties.error AS error, count() AS attempts
FROM events
WHERE event = 'device_checkout_result' AND properties.outcome = 'failed'
  AND timestamp > now() - INTERVAL 30 DAY
GROUP BY batch, status, error
ORDER BY attempts DESC
```

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
