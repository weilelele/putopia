# 08 · Multiverse Console

## 1. Positioning

The Multiverse Console is both the **core prop of the fiction** (the retro device a Voyager uses to
observe parallel worlds) and the product's **home-page hook for guests** — an interactive/showcase
console panel that manufactures mystery and the curiosity of "what can this device do?" It makes the
abstract "explore the multiverse" concrete as a machine with knobs, a screen, and a red light.

## 2. Player touchpoints

- **Guest home hero**: brand wordmark (split-flap flip animation) + device icon + narrative copy
  ("you've found your way into the Multiverse Collective's internal network… our most enigmatic
  instrument, the Multiverse Console — a device built to reach into parallel worlds and observe") +
  the **MC console panel** (`McConsolePanel`) + apply/login CTAs.
- **Path status bar** "device" cell: when a Voyager has no Console assigned, tapping shows a "device
  scan in progress — we'll notify you" modal.
- **Device Archive** (07): each physical Console unit *is* this device.

## 3. MC function panel (`mc_functions`)

The console panel shows a set of "function items," configured by Architects in admin
`/admin/mc-config` (title, description, ordering, etc.). It is a **data-driven showcase component** —
ops can add/edit/remove the list of "what the console can do" to gradually reveal capabilities and
build anticipation, without code changes.

| Item | Notes |
|---|---|
| `mc_functions` table | function items: title/description/sort_order etc. |
| Read | `getMcFunctions` (cached 5 min, same for everyone) |
| Write | Architect CRUD (`/admin/mc-config`) |

## 4. Device fiction (from logs & copy)

- A retro hybrid of radio/TV/monitor with left-right knobs; you turn them to hunt a signal.
- The screen shows parallel-world imagery, often uncertain/glitchy (echoing Signal Dispatch's "glitch" asset processing).
- **Red light = a connection to a parallel world established**; **Quantum Energy button = send a message across worlds**.
- Each device has an owner and a handoff history (see Unit 001 etc. in 07).

## 5. Current status & gaps

- ✅ Home panel, narrative hero, `mc_functions` data-driven config, device registry are live.
- 🟡 The console is currently "showcase + narrative"; there is **no real "operate the device to produce
  a gameplay outcome"** interaction (knobs/red light are visual/copy layers).
- ⬜ "Owning a Console" has no functional consequence for a Voyager yet (only identity symbolism + ownership in the archive).

## 6. Future hooks

- Make the Console a real gameplay entry: turn the knob = enter a world's signal ID (into Signal
  Dispatch), red light = feedback for a successful contribution/connection.
- Upgrade `mc_functions` from a "showcase list" to "clickable function entries," unlocking different
  abilities per role/tag.
