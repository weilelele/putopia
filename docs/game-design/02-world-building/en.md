# 02 · World Building

## 1. Positioning

World Building is the *player-facing* layer of **Spine B (the world lifecycle)** and the product's
core content engine. It answers: "how does a parallel world go from a vague idea, get identified and
tuned by the community, and finally get confirmed into the archive?" The pages are
**World Records `/worlds`** (archive + pipeline overview) and **World Detail `/worlds/[id]`**.

> The *tuning* process (crowd-sourced daily puzzles) is carried by **Signal Dispatch**, see
> [03](../03-signal-dispatch/en.md). This doc focuses on the world object itself, the 3-stage
> lifecycle, the submission entry, and the archive presentation.

## 2. The 3-stage lifecycle

The backend `worlds.lifecycle_state` has four internal values that **collapse into 3 public stages**
(`worldStage()`):

| Public stage | Internal value | Meaning | Section on `/worlds` |
|---|---|---|---|
| **Stage 1 · Initial Vision** | `proposed` | a just-reported sighting, unreviewed | INITIAL VISION (badge UNREVIEWED, amber) |
| **Stage 2 · Signal Tuning** | `picked` / `syncing` | picked by an Architect, being tuned via daily puzzles | SIGNAL TUNING (badge IN REVIEW / BUILDING, green/blue) |
| **Stage 3 · Established World** | `stable` | confirmed to exist, archived | ESTABLISHED WORLD (badge CONFIRMED, orange) |

`/worlds` shows a stats bar (counts per stage) above three card grids, one per stage.

## 3. Player journey

```
① Report a sighting (any signed-in user)   ② Architect picks & starts tuning   ③ Community IDs daily signals   ④ Confirmed & archived
   /worlds/submit                            promoteWorldToTuning               /signal Signal Dispatch          stable → World Records
   → proposed (Initial Vision)               → syncing (Signal Tuning)          narrowing day by day            → established
```

### 3.1 Report a sighting `/worlds/submit`

- Any signed-in user (incl. applicants) may submit. This is **Applicant Task 01** (see [01](../01-identity-progression/en.md)).
- Fields: world name (zh/en), description, atmosphere colors (gradient_from/to — for un-illustrated
  worlds these two colors fill the whole card).
- Submitting creates a `worlds` row: `lifecycle_state='proposed'`, `is_verified=false`,
  `submitted_by=self`, ID like `PROP-XXXX`. It posts a `world_added` Status event and redirects to
  `/worlds?submitted=<name>` showing a "SIGHTING FILED — entered the Architect review pipeline" banner.

### 3.2 Architect picks → start tuning

- An Architect **promotes** a `proposed` world **into Signal Tuning** (`promoteWorldToTuning`):
  it creates an **Investigation (= a `signal_threads` row bound to that world)**, sets the world's
  voting permission `vote_scope`, and advances the world to `syncing`. It also posts a
  "Now Tuning: <world>" system story to the community feed.
- An Architect may also **seed a brand-new world straight into tuning** (`createWorldForTuning`, ID
  like `WB-XXXX`) when there is no player-submitted world and ops wants to open a topic itself.

### 3.3 In tuning (Stage 2)

See [03 Signal Dispatch](../03-signal-dispatch/en.md). Key points:
- Each tuning world = one Investigation thread holding multiple "days" of puzzles.
- The card cover **updates in real time** to the first visual asset of that world's most recent
  published day (`getTuningCovers`). Cover priority: live tuning cover → uploaded world image → atmosphere gradient.

### 3.4 Confirmed & archived (Stage 3)

- An Architect advances the world to `stable`; it enters the **World Records main archive** (public,
  visible to everyone, cached 60s).
- The archive card shows: cover (image or atmosphere), ID, name, description, discoverer, discovery date.

## 4. The world object's data shape

| Field | Notes |
|---|---|
| `id` | text PK (`PROP-*` player-submitted / `WB-*` ops-created / legacy IDs) |
| `name` / `name_en` | zh/en names |
| `discoverer_id` / `discoverer_name` | discoverer (denormalized name) |
| `discovery_date` | discovery date |
| `gradient_from` / `gradient_to` | atmosphere colors (fill the card when no image) |
| `image_path` | uploaded world image (optional) |
| `description` | description / initial-vision text |
| `lifecycle_state` | `proposed/picked/syncing/stable` |
| `vote_scope` | voting permission for this world's puzzles `self/voters/all` (see 03) |
| `submitted_by` / `submitted_at` | player-submission origin |
| `is_verified` | legacy boolean, true for stable worlds |

**Images**: the `world_images` table (Supabase Storage `world-images` bucket). Upload runs through a
server action (service_role) that writes the object + records the public URL. `source ∈ {upload, repost}`;
reposted external links store only the URL.

## 5. Permissions & visibility

- **Read**: stable worlds are **public to everyone**; proposed/picked/syncing pipeline worlds are
  visible to **any signed-in user** (the community can watch worlds being built).
- **Write**: any signed-in user may insert a `proposed` world (RLS `worlds_insert_proposed`); state
  transitions, images, deletion are Architect admin actions (service_role).

## 6. Current status & gaps

- ✅ 3-stage lifecycle, submission entry, archive/pipeline presentation, live tuning covers, image upload are live.
- 🟡 `picked` and `syncing` both read as "Signal Tuning" publicly; the internal distinction
  (IN REVIEW vs BUILDING) only shows on the badge.
- ⬜ A player's proactive notification/tracking for "which stage my submitted world reached" is weak
  (only the Dispatch dashboard's `yourWorlds` list).
- ⬜ World-detail discussion reuses `comments` (subject_type='world'), but there is no reward loop for
  "your sighting was adopted/promoted."

## 7. Future hooks

- Sighting adopted/promoted → award the submitter points or honor (ties into 01's points hook).
- "My worlds" tracking wall: a personal progress timeline submit→picked→tuning→established.
- Beyond atmosphere colors, let players attach an image at the Initial Vision stage to enrich early cards.
