# 01 · Identity & Progression

## 1. Positioning

The identity system implements **Spine A (the progression engine)** — it defines *who the player
is, what they can do, and where they go next*. It threads acquisition (guest→applicant) and
paid/grind conversion (applicant→voyager) into one visualized "Path."

## 2. Roles & upgrade paths

```
Guest ──register──► Applicant ──┬── Path A: buy the $12 Voyager Pack directly ──► Voyager
                                └── Path B: task-gated (finish prerequisites) ──► Voyager (when sales open)
Architect: granted manually in admin; bypasses the above
```

- **Guest → Applicant**: submit email → Supabase invite email → `/register` set name+password →
  `voyager_profiles` row auto-created (trigger, role=applicant). See [Onboarding](../11-onboarding-acquisition/en.md).
- **Applicant → Voyager**: the single server entry point `provisionVoyagerMembership(userId)` —
  ensure the profile row exists → atomic upgrade (`provision_voyager` RPC: role=voyager + assign
  `member_no` + join current batch) → post a `voyager_activated` event to the Status feed on first
  activation. **Idempotent**; never downgrades an architect.
- **Approving an application** in admin also flips that account to voyager (`applications.ts`).

## 3. Voyager Path page `/voyager-path` (the task-gated experience)

The applicant's "progression hub": a stage rail (Applicant → Voyager → Console) plus a task checklist.

**The two currently-gating prerequisites** (`tasks.ts`, `allDone = sighting && quiz`):

| # | Task | Completion check | Entry |
|---|---|---|---|
| 01 | **Report a Sighting** | the user has a `worlds` row with `submitted_by` = self | `/worlds/submit` |
| 02 | **Qualify for Active Service** | pass the applicant quiz → stamps `task_quiz_at` | `/quiz` |

> Earlier designs also had "vote on ≥2 distinct polls (`votes`)" and "read an intel to the end
> (`task_intel_at`)". The code still tracks these but they **no longer gate** the upgrade (see
> `getApplicantTaskStatus`).

Below the rail are **benefit previews** for the Voyager / Console stages (each opens an explainer
modal), plus locked-state hints (Device Seeker = "materials in preparation"; Signal/Console = "coming soon").

## 4. Direct-purchase path `/voyager-pack`

Skip the tasks and pay $12 for the "Initial Voyager Pack" to upgrade instantly. See [Commerce](../10-commerce/en.md).
The two paths are split by an **A/B experiment** on the home ad slot (see §6).

## 5. Member number & batch

- On upgrade, `provision_voyager` atomically assigns a **`member_no`** (e.g. VOYAGER #007) and stamps `member_since`.
- The player joins the **current batch** in `batches` (`is_current=true`, e.g. `2026 Batch S2`);
  historical members are `Original Batch`.
- `member_source` distinguishes `granted` (assigned a device) vs `paid` — both have **identical rights**.
- The profile shows "VOYAGER #NNN · <batch>" for pure Voyagers; Architects carry no member number.

## 6. A/B experiment: direct buy vs task-gated

- `voyager_profiles.experiment_group ∈ {direct, task_gated, null}`, assigned on first visit by `experiment.ts`.
- The home ad slot `VoyagerAdSlot` (shown only to applicants while sales are open):
  - `direct` → orange "INITIAL VOYAGER PACK" → `/voyager-pack` (buy now).
  - `task_gated` → amber "EARN YOUR STATUS" → `/voyager-path` (tasks first).
- `/voyager-pack`'s CTA checks the task gate for the `task_gated` group: if incomplete the button
  becomes "Complete Tasks to Purchase."

## 7. Voyager tags — 🟡 designed / partial

> A tag is a stackable marker *under the Voyager tier*, **not** a separate role. A Voyager may hold one or both.

| Tag | Meaning | Status |
|---|---|---|
| **World Builder** | identify signals, build worlds | ✅ the current default direction (the activation event copy literally says "World Builder") |
| **Device Seeker** | locate devices | ⬜ locked; UI shows "coming soon / materials in preparation" |

> `system-design.md` designs a standalone `voyager_tags` table (multi-row = multiple tags, `is_paid`
> binds the Pack). Production code does not yet create it; tags currently surface only as copy and as
> locked placeholders on `/voyager-path`.

## 8. Profile `/profile`

- **Identity header**: avatar, name, role badge, (Voyager) member number + batch.
- **Pack fulfillment timeline**: a four-step `paid → preparing → shipped → delivered` tracker +
  tracking number / link (see Commerce).
- **Editable fields**: name, location, bio (≤240 chars), social links (X / Instagram / LinkedIn).
- **Permission gate**: only Voyager / Architect may edit the dossier and see fulfillment; Applicants
  see "PROFILE LOCKED + view your path."

## 9. Path status bar `PathStatusBar`

A persistent identity mini-card on home and profile: avatar · identity · device status. Tapping the
device opens a "device scan in progress" modal (placeholder copy while a Voyager has no Console
assigned yet). It is the anchor entry into the Path.

## 10. Data & permissions

| Item | Location |
|---|---|
| Role enum | `user_role` (`schema.sql`) |
| Auto-create profile | `handle_new_user()` trigger, defaults applicant, backfills email (v40) |
| Atomic upgrade fn | `provision_voyager(uuid)` RPC (`schema_v21`) |
| Member fields | `member_source / member_no / member_since / batch_label` (`schema_v20`+) |
| Task timestamps | `task_quiz_at / task_intel_at` (`voyager_profiles`) |
| Experiment group | `experiment_group` (`experiment.ts`) |
| Registration mark | `registered_at` (≠ `joined_at` = invite-sent time) |

> **Metric caveat**: a real "registered" user = `registered_at` is non-null; `joined_at` only means
> the invite email went out and must not be used for conversion math.

## 11. Current status & gaps

- ✅ Roles, upgrade, member number, batch, A/B, Path page, profile, fulfillment timeline are live.
- 🟡 Voyager tags are placeholder only; the `voyager_tags` table is not built.
- ⬜ Points / early Console unlock not implemented (`schema_v33` stub).
- ⬜ Refund-driven role downgrade and confirmation email for existing accounts still pending.

## 12. Future hooks

- Land World Builder / Device Seeker as real rows; open dual tags and per-tag deep benefits.
- Introduce points (from signal participation, sightings adopted, etc.) → discounted Console unlock or higher batch seats.
- Wire the Path page to live task progress with strong "next step" guidance.
