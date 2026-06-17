# 05 · Intel

## 1. Positioning

Intel is the org's **official-bulletin / worldbuilding-narrative vehicle** — "intel articles"
published by Architects to advance the story, announce device movements, and post org notices. It is
both the guest-facing "front-page content" and a tiered benefit (classified intel). Pages:
**`/intel` (INTEL, list)** and **`/intel/[id]` (detail)**.

## 2. Gameplay / experience

- An Architect writes intel in admin: title, body, images, tag `tag ∈ {NOTICE, DEVICE, ORG}`, classified flag.
- The list and the home "LATEST INTEL" block show cards (publisher avatar/name, date, tag, comment count).
- The detail page shows the full article + comment discussion (reuses comments, subject_type='intel').
- **Read tracking**: scrolling to the bottom fires `markIntelRead()`, stamping
  `voyager_profiles.task_intel_at` — historically an applicant task (no longer a gate, still recorded).

## 3. Tiered visibility

| Category | Who can see |
|---|---|
| `classified=false` (public) | everyone (incl. guests) |
| `classified=true` (classified) | voyager / architect (enforced by RLS) |

> Classified intel is part of the paid/upgrade benefit ("paying grants the same rights as a granted-device voyager, incl. classified intel").

## 4. Data & permissions

| Item | Notes |
|---|---|
| `intel` table | id(text), title, content, images, tag, classified, publisher_id/name, timestamp |
| Read | public via cached `getPublicIntel` (60s, incl. publisher avatar); classified via RLS `getAllIntel` |
| Write | Architect (service_role) CRUD; publish posts `intel_published`, update posts `intel_updated` Status events |

## 5. Current status & gaps

- ✅ Authoring, images, tags, public/classified tiers, read tracking, comments, feed are live.
- ⬜ Cross-referencing between intel and worlds/signals is weak (no structured "this article relates to world X").
- 🟡 An AI news-draft admin tool also exists (`news-gen.ts` / `/admin/create-news`) to assist ops output.

## 6. Future hooks

- Use intel as "story nodes" of the world lifecycle: auto-generate an article when a world is established.
- Tie classified-intel unlocks to points/batches for content progression.
