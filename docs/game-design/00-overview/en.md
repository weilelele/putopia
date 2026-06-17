# 00 · Overview: Fiction, Roles & System Skeleton

## 1. Positioning

Multiverse Collective is a **narrative-driven, roleplay-flavored community platform** presented
as the *internal network of a secret organization*. It is not a level-based game in the classic
sense; instead it wraps ordinary community actions (submitting, voting, identifying signals,
discussing) inside a coherent sci-fi fiction and an identity-progression system, so that
"participating in the community" doubles as "playing a Voyager who guards the multiverse."

- **Stack**: Next.js 16 + Supabase web app. Desktop = sidebar nav; mobile = bottom nav.
- **Aesthetic**: pure orange + deep-space blue + monospace Courier Prime — a retro-terminal / HUD-console feel.
- **Tagline**: *"Building better worlds, together." / "Explore parallel worlds."*

## 2. Core fiction (worldbuilding)

| Concept | Meaning |
|---|---|
| **Multiverse Collective** | The secret organization the player joins; "we guard the order of the multiverse." |
| **Voyager** | The member identity. Someone "selected" to observe and explore parallel worlds. |
| **Multiverse Console** | The hero device — a retro radio/TV-like unit; turn the knobs to hunt a signal and glimpse parallel worlds. A red light = a connection established; a "Quantum Energy button" sends a message across worlds. |
| **Parallel Worlds** | The objects players "discover and confirm," forming the World Records archive. |
| **Signal** | Image/sound fragments from a parallel world; identifying signals is the core daily loop. |
| **Architect** | The org's leadership (the operators/staff): reviews, authors puzzles, publishes. |

> Tone reference: the two first-person stories in `content/stories.ts` — receiving the device,
> turning the dial, the chill of being *looked back at* by someone in a parallel world, the red
> light flickering on. These are the emotional anchors the product repeatedly aims for.

## 3. Two orthogonal spines

The whole system is best read as **two orthogonal state machines**; everything else is a
content source or a task source hanging off them.

### Spine A — User progression (the identity engine)

```
Guest ──► Applicant ──(complete tasks)──► Voyager ──► (designed) deeper unlocks
                            ▲
                  one of two paths:
                  · buy the $12 Voyager Pack directly
                  · the task-gated path (finish prerequisites)
```

See [`01-identity-progression`](../01-identity-progression/en.md).

### Spine B — World lifecycle (the World Building workflow)

```
Player reports a sighting ──► Initial Vision ──► Signal Tuning ──► Established World
        Stage 1                                  Stage 2 (crowd-sourced daily puzzles)   Stage 3 (archived into World Records)
```

See [`02-world-building`](../02-world-building/en.md) and [`03-signal-dispatch`](../03-signal-dispatch/en.md).

> **Key judgment**: World Building and Signal Dispatch are two views of the same backend —
> World Building is the *world-centric* presentation, Signal Dispatch is the *daily-puzzle-centric*
> participation surface. They share the `worlds` / `signal_threads` / `signal_tasks` tables.

## 4. Role / permission matrix

| Role | Origin | Can see | Can do |
|---|---|---|---|
| **Guest** | not logged in | public content (home broadcast, public intel) | browse, apply, view marketing/onboarding |
| **Applicant** | default after register | most pages | report worlds, vote, read intel, take the quiz, *watch* signal puzzles (cannot file) |
| **Voyager** | upgraded via payment or task-gate | everything (incl. classified intel) | all of Applicant + participate in signal puzzles, post logs, be assigned a device, edit full dossier |
| **Architect** | granted in admin | everything + admin | full management: author, review, publish, CRUD, impersonate-post |

> Role enum: `guest / applicant / voyager / architect` (`user_role` in `schema.sql`).
> Registration defaults to `applicant` (the `handle_new_user` trigger). The single write path to
> `voyager` is `provisionVoyagerMembership()` (paid/manual), or approving an application in admin.

## 5. Information architecture (navigation)

**Desktop sidebar**: INTEL · DEVICE ARCHIVE · VOYAGER LOGS · VOYAGERS (roster) · VOTING HUB · WORLD RECORDS.

**Mobile bottom bar**: primary HOME / INTEL / DEVICES / VOYAGERS; a "MORE" drawer holds
DISPATCH (Signal Dispatch) / VOYAGER LOGS / VOTING HUB / WORLD RECORDS / MY PROFILE.

**Home `/console`** switches by auth state:
- Guest: brand hero + Multiverse Console intro panel + apply/login CTAs + "ask us" (operator X accounts).
- Applicant: brand hero + path status bar + Status activity feed + Voyager-upgrade ad slot (A/B).
- Voyager: welcome copy + path status bar + Status feed.
- Below any logged-in hero: previews of Device Registry, Latest Intel, World Records, Active Votes.

## 6. Module map (scope of this GDD)

| Module | Status | Doc |
|---|---|---|
| Identity & progression / pack upgrade / tags | ✅ / 🟡 tags | 01 |
| World Building (3-stage lifecycle, report a sighting) | ✅ | 02 |
| Signal Dispatch (investigation threads, daily puzzles, Cosmo sourcing, recall) | ✅ | 03 |
| Voting Hub (role-scoped polls) | ✅ | 04 |
| Intel (public/classified articles, read tracking) | ✅ | 05 |
| Voyager Logs (story submission/review) | ✅ | 06 |
| Device Archive (known/unknown devices, claim, locked Device Seeker) | ✅ / 🟡 | 07 |
| Multiverse Console (device fiction + function panel) | ✅ | 08 |
| Community & social (comment threads, impersonation, Status feed, digest feed) | ✅ | 09 |
| Commerce ($12 Voyager Pack, Stripe, order fulfillment, batches) | ✅ | 10 |
| Onboarding & acquisition (funnel, UTM variants, apply, register, email, A/B) | ✅ | 11 |
| Admin & operations (per-module tooling) | ✅ | 12 |

## 7. Future hooks (instrumented, awaiting design)

- **Points system + early Multiverse Console unlock**: `schema_v33` stubs `points_ledger` /
  `console_unlocked_at`. Currently **on hold**, not on the dev roadmap.
- **Voyager tags**: World Builder (identify signals) / Device Seeker (locate devices — currently
  locked, shown as "coming soon").
- **Device exploration progress**: unknown devices carry `exploration_progress`, currently
  display-only with no loop attached.
- **Signal-thread clarity/drift auto-advance**: `schema_v34` designed a "crowd majority → next day
  clearer" auto mechanic; v38 reverted to **fully manual authoring**, leaving those columns unused.
