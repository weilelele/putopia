# 04 · Voting Hub

## 1. Positioning

The Voting Hub is the classic **community poll system**, used for "inner-circle collective decisions /
expressing a stance." It was once one of the applicant task sources, and it delivers the
"Inner Circle Access" promised in the Voyager Pack copy. Page: **`/vote` (VOTING HUB)**.

> Distinct from Signal Dispatch (03): a vote is a **one-shot poll with explicit options and results,
> unrelated to any specific world**; Signal Dispatch is a continuous, world-bound identification puzzle.
> They sit on different tables.

## 2. Gameplay

- An Architect creates a poll in admin: title, description, **single/multi** choice, options, **scope**,
  active flag, end time.
- Players vote on `/vote` or in the home "ACTIVE VOTES" block; **after voting, per-option tallies/shares are shown**.
- One vote per person per poll (signed-in users dedup by user_id; anonymous public votes by a browser fingerprint anon_token).

## 3. Role scope (who may vote)

`votes.scope` is a role array (upgraded from a single value in `schema_v8`; legacy values are bridged by `normalizeScope`):

| scope meaning | Eligible roles |
|---|---|
| public | applicant / voyager / architect (+ anonymous guests may cast public votes) |
| applicant | applicant / voyager / architect |
| voyager | voyager / architect |
| architect | architect |

> Note: **all polls are visible to everyone** (scope controls *participation*, not *visibility*).

## 4. Data & permissions

| Table | Notes |
|---|---|
| `votes` | poll: title/description/type(single/multi)/scope/options(jsonb)/is_active/ends_at |
| `vote_responses` | filing: vote_id + (user_id or anon_token) + selected_options[]; unique constraint prevents duplicates |

- Tally via `getVoteResultsBulk` (cached 20s) / `getVoteResults`: counts per option id.
- A successful vote posts a `vote_cast` Status event and a PostHog `vote_response_submitted`.
- Creating a poll posts a `vote_opened` event.

## 5. Current status & gaps

- ✅ Create/participate/results/role-scope/anonymous public votes/feed + analytics are live.
- 🟡 The home feed currently **temporarily hides all vote events** (git commit "temporarily hide all vote events").
- ⬜ Voting has no strong coupling with worlds/signals (it doesn't advance a world like Signal Dispatch does).

## 6. Future hooks

- Feed "inner-circle vote results" back into World Building decisions (e.g. crowd-pick the next world to enter tuning).
- Bind polls to batches/tags for tiered voice.
