# 03 · Signal Dispatch (daily puzzles)

## 1. Positioning

Signal Dispatch is the product's **core daily participation loop** and the engine of World Building's
Stage 2 "Signal Tuning." It frames "identifying parallel-world signals" as **crowd-sourcing with no
right/wrong**: every day the org "asks the community for help" — "of these signals, which is the
closest match / which does not belong to this world?" — collecting each person's independent judgment
and tuning a fuzzy world clearer day by day. The page is **`/signal` (DISPATCH)**.

> Difference from the Voting Hub (04): the Voting Hub is a classic poll (explicit options, see results).
> Signal Dispatch is a multi-day visual/audio identification puzzle *about a specific world*, carrying
> the world lifecycle.

## 2. Three nested objects

```
World (stage = syncing)
  └── Investigation / Thread (one investigation = a signal_threads row bound to a world)
        └── Day (one day's puzzle = a signal_tasks row, day_index 0,1,2…)
              └── Assets (candidate media = signal_task_assets rows; only is_selected go live)
                    └── Responses (player filings = signal_responses; one per person per day)
```

- **Investigation (thread)**: strictly equals "a world in its Signal Tuning phase." Title/cover/owner all come from the world.
- **Day (task)**: a day within the investigation; has a type, a hand-written prompt, a publish state. `day_index` forms the time chain.
- **Asset**: image/video/audio candidates sourced from a library, cropped + glitched; only the Architect-selected (`is_selected`) ones are visible to players.

## 3. Three puzzle types

| Type | Gameplay | Media |
|---|---|---|
| **visual_match** | given a "main" reference image, pick the option that matches best / belongs to the same world | image |
| **visual_odd_one** | given a set of images, find the one that does *not* belong to this world | image |
| **audio_odd_one** | given a set of sounds, hear the one that does *not* belong | audio (extracted from video) |

> The type can change per day (`addDayToInvestigation` carries the previous day's type forward; the Architect can change it).

## 4. Player experience (`/signal`)

`getInvestigationFeed` returns every world-investigation that has published days, organized as world
cards, each expanding into its days.

**Core rule — independent judgment + reveal-after-submit**:

| Who | See module/puzzle | File a response | See distribution | See participant count |
|---|---|---|---|---|
| Applicant | ✅ | ❌ (not eligible) | ❌ | ✅ |
| Voyager (not yet filed) | ✅ | ✅ | ❌ (hidden pre-submit, to keep judgment independent) | ✅ |
| Voyager (already filed) | ✅ | — | ✅ unlocked after submit | ✅ |
| Architect | ✅ | ✅ | ✅ (always) | ✅ |

- **No right/wrong**: the puzzle shows only "how many participated"; it does **not** reveal a correct
  answer or grade. The hidden "target" lives only on the backend thread/asset (`is_target`) and is
  **never sent to the client** (`getSignalFeed` selects safe columns only).
- **Reveal after submit**: after `submitSignalResponse(taskId, assetId)`, the player unlocks that
  puzzle's **filing distribution** (how many chose each option), like a poll reveal. One filing per
  person per puzzle (unique constraint).

## 5. Per-world voting permission `vote_scope`

Each world's Architect sets who may file on its puzzles (`worlds.vote_scope`, via `eligibleToVote`):

| `vote_scope` | Meaning | Who may file |
|---|---|---|
| `self` | private exploration | only the world's owner (discoverer) |
| `voters` | Voyagers only | role=voyager and above |
| `all` (default) | everyone | any signed-in user (incl. applicants) |

> Architects may always file. When locked, the card shows the reason: "Log in to respond" / "Private —
> owner only" / "Voyagers only." Note: DB RLS still requires the `signal_responses` inserter to be
> voyager+ (`signal_responses_insert_voyager`); the server action then layers the per-world
> `vote_scope` check on top — both layers decide final eligibility.

## 6. Recall (re-engagement)

- 24 hours after a day's puzzle is published, remind players who participated in this world before but
  haven't filed for the new day that "a new signal has appeared."
- Timing references `signal_tasks.published_at`; `recall_sent_at` guards the cron from re-scanning;
  `signal_recall_log` (task_id+user_id) dedups per person.
- Driven by the cron endpoint `/api/cron/signal-recall` (`src/lib/signal/recall.ts`).

## 7. Authoring workflow (Architect admin `/admin/signal-tasks`)

This is Signal Dispatch's "content production line," **fully manual** (auto-generation/auto-advance
was removed in v38):

```
① start tuning           ② add a day            ③ source & generate candidates   ④ curate            ⑤ publish
promoteWorldToTuning     addDayToInvestigation   generateCandidates /              setAssetSelected     setTaskPublished
/createWorldForTuning                            pullForgeAssets                   setAssetRole/Order    (posts a feed story)
```

### 7.1 Source — the Cosmo content library (read-only)

- Puzzle media comes from an external MongoDB library **Cosmo** (`src/lib/cosmo.ts`): channel (with
  freq) → embedded band → the band's `imagePoolIds/videoPoolIds` → ai-image / ai-video (filtering
  completed + not deleted).
- Audio uses band.soundtrack or extracts the track from a video.

### 7.2 Processing pipeline (crop + glitch)

`src/lib/signal/process.ts` + `av.ts`:
- **Image**: crop + glitch per `crop_config` (shape square/circle/rect, area ratio, position, glitchIntensity 0–100).
- **Video**: crop + glitch into a short clip, plus an extra **animated WebP (display_url)** for auto-looping display on the frontend.
- **Audio** (audio_odd_one): extract an audio clip from a video (~25% of clips have no track, so it oversamples).
- Results upload to the Storage `signal-assets` bucket, recording `processed_url` / `display_url`.

### 7.3 Two sourcing modes

- **Random Forge import** (`generateCandidates`): sample N assets from each source (channel+band) and run the pipeline.
- **Precise Forge pick** (`pullForgeAssets`): browse a band's assets (`listBandAssets`), hand-pick specific asset ids, run the pipeline.

### 7.4 Curate & publish

- All candidates land as `is_selected=false`; the Architect flips `is_selected=true` to decide which
  go live, sets the role (main/option) and display order.
- Publishing (`setTaskPublished`) stamps `published_at`, re-arms the recall guard; if the day belongs
  to a thread, it auto-posts a "Day N · <world>: new signals live" system story to the feed.

## 8. Home dispatch board `getDispatchDashboard`

A Signal Dispatch stats card on home for signed-in users:
- `awaitingYou`: published puzzles you're eligible to vote on but haven't.
- `inTuning`: total published puzzles across all tuning worlds.
- `yourWorlds`: the worlds you discovered and their current stage.

## 9. Data & permissions

| Table | Role | Key columns |
|---|---|---|
| `signal_threads` | **architect only** (holds the hidden answer) | group_*/target_* (source & truth), `world_id`, `status(open/locked/lost)`, clarity/drift (v34, retired) |
| `signal_tasks` | published visible to signed-in users | `type`, `prompt`, `day_index`, `prev_task_id`, `published_at`, `recall_sent_at` |
| `signal_task_assets` | visible only when `is_selected` and parent task published | `media`, `processed_url`, `display_url`, `asset_role`, `is_target` (never sent) |
| `signal_responses` | own rows only; distribution via service_role aggregate | unique (user, task) |

## 10. Historical evolution (important)

- Early `schema_v32/v33`: signal puzzles were a "standalone top-level module, unrelated to worlds" daily call.
- `schema_v34`: introduced thread + hidden truth + an **auto-advance** idea ("crowd majority → next day clearer (clarity) / divergence → noisier (drift)").
- `schema_v38` (current): **welded signal tuning into the world lifecycle** — a thread strictly = one
  tuning world, and authoring became **fully manual**; the clarity/drift auto mechanic was retired
  (columns kept, unused).
- This means `system-design.md`'s Phase 4 description is superseded by the v34/v38 "World-Building-ization"
  refactor — **this doc is authoritative**.

## 11. Current status & gaps

- ✅ Three types, independent-judgment + reveal, per-world permission, recall, Cosmo sourcing, crop/glitch, manual authoring & publish are live.
- 🟡 The hidden `is_target` and thread `status(locked/lost)` exist but are **not consumed by gameplay** (no auto-confirm/loss).
- ⬜ "How much tuning counts as established" is currently the Architect's subjective call; no quantified clarity-threshold mechanic.
- ⬜ Players get no "my identification accuracy/contribution" growth feedback (by design, since there's no right/wrong).

## 12. Future hooks

- Use the hidden truth for a "post-game reveal / this world was ultimately confirmed as X" story beat, while keeping the participation phase spoiler-free.
- Re-enable a softened clarity/drift as a visible "tuning progress bar" for a world.
- Extend recall from email to in-app notifications / push.
