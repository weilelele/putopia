# 09 · Community & Social

## 1. Positioning

The social layer is the cross-cutting system that glues all the content modules into a living
community: **comment discussion** makes content conversational, the **Status feed** makes the org feel
"alive, people are doing things," and the **roster** gives Voyager identity visibility. It is not a
standalone page but a capability woven through intel / devices / worlds, etc.

## 2. Comment system (polymorphic threads)

One `comments` table backs discussion for three subject kinds: `subject_type ∈ {device, intel, world}`.

- **Who can comment**: signed-in users; a comment may attach up to 3 images (`image_paths`, via upload).
- **Reply threads**: `parent_id` supports nested replies; the replied-to user gets an **email
  notification** (Resend, `src/lib/email.ts`; recipient from `voyager_profiles.email`; replying to
  yourself sends nothing).
- **Architect impersonation ("post as")**: when commenting, an Architect can choose to "POST AS"
  another voyager/architect identity (e.g. operator Ryo) — `author_*` stores the target identity,
  `posted_by_id` privately records the real operator (not in the client payload). Used by ops to keep
  the community vibe alive.
- Key files: `comments.ts`, `comment-thread.tsx` (includes a reusable Composer).

## 3. Status feed (activity events)

`activity_events` records site-wide notable actions, rendered as the home **Status Feed** (visible on
the Voyager/Applicant home).

| Event type | Trigger |
|---|---|
| `world_added` | report / create a world |
| `voyager_activated` | upgrade to Voyager (first time; copy says "World Builder") |
| `member_joined` | application approved |
| `vote_opened` / `vote_cast` | open/cast a vote (**currently hidden**) |
| `intel_published` / `intel_updated` | intel publish/update |
| `device_updated` | device assign/release/update |

> Supports `group_key` to collapse similar events (e.g. many voyager activations into one).
> `getActivityFeed(days)` pulls the last N days.

## 4. Digest feed (Dashboard Feed)

`dashboard_feed` is an **auto-generated "org broadcast" digest** (`generateAndSaveFeed`): from intel /
known devices / new members it templates up to 8 short broadcasts, interleaved by type quota
(intel/device/voyager), as a teletype-style ticker. It is more of an ops/atmosphere device,
coexisting with the Status Feed.

## 5. Roster `/voyagers`

A public roster of Voyagers/Architects (avatar, name, member number, batch, social links). It
delivers the Voyager Pack's "Batch Seat" benefit — "your name appears in the roster."

## 6. Data & permissions

| Table | Notes |
|---|---|
| `comments` | subject_type/id, author_*, posted_by_id (audit), parent_id, image_paths, is_visible |
| `activity_events` | event_type, actor_*, target_*, group_key |
| `dashboard_feed` | auto-generated lines (with entity avatar references) |

## 7. Current status & gaps

- ✅ Polymorphic comments, images, reply threads + email notifications, impersonation, Status feed, digest feed, roster are live.
- 🟡 Vote-type Status events are currently hidden.
- ⬜ No lighter interactions (likes/reactions/notification center); comments have no cross-page "all my discussions" aggregate.

## 8. Future hooks

- In-app notification center (unify reply, recall, world promotion, pack shipping alerts).
- Likes + featuring for comments/logs to form a light reputation system (ties into the points hook).
