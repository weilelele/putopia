# 06 · Voyager Logs (Stories)

## 1. Positioning

Voyager Logs is the stage for **player-generated content (UGC)** — first-person narrative stories
submitted by Voyagers recounting their explorations with the Multiverse Console. It carries the
product's strongest **emotional / immersion** function (see the tone of the two samples in
`content/stories.ts`: receiving the device, being looked back at by someone in a parallel world, the
red light flickering on). Pages: **`/logs` (VOYAGER LOGS, list)** and **`/logs/[id]` (detail)**.

## 2. Gameplay / workflow

```
Voyager writes a submission (draft, is_published=false) ──► Architect reviews ──► publish (is_published=true) ──► public display
submitStory                                                /admin/stories       publishStory
```

- **Submit** (Voyager+ only): title, tags, excerpt, body, (optional YouTube video). New submissions default to an **unpublished draft**.
- **Authors can edit their own unpublished drafts**; after publishing, control is the Architect's.
- **Review & publish**: Architect can publish/unpublish/edit/delete in admin, and may ghostwrite
  (author_name can be "The Organization" — Signal Dispatch uses this identity to auto-post system stories on publish).

## 3. Visibility

- Published stories: **readable by Voyager+ only** (RLS `stories_select_published`) — logs are "inner-circle" content.
- Authors can read their own stories in any state; Architects can read all.

## 4. Data & permissions

| Item | Notes |
|---|---|
| `stories` table | id(slug), title, author_id/name, date, tags[], excerpt, content, is_published, youtube_id |
| Read | `getPublishedStories` (incl. author avatar); `getMyStories`; `getAllStories` (architect) |
| Write | submit `submitStory` (forced draft); author edits draft `updateMyStory`; Architect full control |
| Analytics | submission posts PostHog `story_submitted` |

## 5. Current status & gaps

- ✅ Submission, draft editing, review & publish, tags, YouTube embed, author avatar, Voyager-only visibility are live.
- 🟡 The system also uses the stories table for Signal Dispatch "system broadcast stories"
  (author='The Organization'), sharing one feed with player UGC.
- ⬜ No incentives for great logs (likes/featuring/points).

## 6. Future hooks

- Link logs to specific worlds ("this log happened in world X") to enrich the archive's narrative depth.
- Featured/editor's-pick mechanic; reward great submissions with points or honor tags.
