# 07 · Device Archive

## 1. Positioning

The Device Archive is the **registry of physical Multiverse Console devices** — it turns the hero
prop into a trackable worldbuilding asset: some devices have a known owner and status, others are
still "unknown signals" awaiting exploration. It makes concrete the fiction of "the org tracking
console units around the globe," and is the object the (designed) Device Seeker tag hangs on. Pages:
**`/devices` (DEVICE ARCHIVE)** and **`/devices/[id]` (detail)**.

## 2. Two device kinds

| `knowledge` | Meaning | Key fields |
|---|---|---|
| **known** | confirmed owner/status | `status`, `current_user_id/name` (operator) |
| **unknown** | intercepted a signal but no contact established | `exploration_progress` (0–100) |

Device status `status ∈ {available, in_use, needs_repair, unknown}`, shown on cards in green/orange/red/grey.

## 3. Gameplay / experience

- Browse the registry (Voyager+ sees all; home shows an "1 unknown + 2 known" preview mix to signed-in users).
- Device detail: name, location, description, status, current operator; comment discussion (comments, subject_type='device').
- **Claim flow** `/devices/claim`: the "First Parts Pack (Cairo Batch 01)" tied to the $12 pack — the
  home page shows Architects a highlighted claim card (`ClaimPreviewCard`, $12, "AWAITING CLAIM").
- **Device assignment = Voyager upgrade**: an Architect assigns a device to someone → they upgrade to
  voyager (`member_source=granted`). This is the alternate Voyager source alongside paid upgrade.

## 4. Device Seeker tag — ⬜ locked

"Locating devices" is the planned **Device Seeker** tag gameplay (the Voyager direction parallel to
World Builder). The UI currently shows "materials in preparation / coming soon" on `/voyager-path`
etc.; no actual loop is implemented.

## 5. Data & permissions

| Item | Notes |
|---|---|
| `devices` table | id(text), name, knowledge, location, description, image_path, status, current_user_*, exploration_progress, batch_id |
| Read | `getAllDevices` (cached 60s, same for everyone); RLS voyager+ only |
| Write | Architect CRUD + image upload (Storage `devices` bucket); assign/release/update progress |
| Feed | assign/release/update posts `device_updated` Status events |

> Legacy static data is in `content/devices.ts` (story-laden samples like Unit 001 "The Originator"), now migrated to the DB.

## 6. Current status & gaps

- ✅ Known/unknown devices, status, operator, claim card, assign=upgrade, images, comments, feed are live.
- 🟡 `exploration_progress` is display-only with no "advance unknown-device exploration" loop.
- ⬜ Device Seeker tag gameplay is unimplemented (locked placeholder).

## 7. Future hooks

- Device Seeker: let Voyagers advance an unknown device's `exploration_progress` via clues/puzzles; full progress → device "established."
- A device "ownership/handoff" narrative (cf. Unit 001 held by a German Voyager for 20 years).
