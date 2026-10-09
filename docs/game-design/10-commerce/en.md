# 10 · Commerce: Voyager Initiation

> 2026-10-06 clarification: legacy members’ first two Packs ship with S26 in October and November 2026; neither has shipped yet. Place a clickable exclamation icon beside the struck-through $520: members who previously paid $12 for the Initial Pack receive a $120 discount and complete Initiation for $400.

> 2026-10-06 counting update: INITIATED means formally enrolled S26 members, including paid members and granted NPCs. Both consume the 100-seat capacity; granted membership is recorded separately and never represented as a payment. Johnaason is the first granted S26 NPC. Profile editing uses an Edit dialog; its three stages describe access, and Console Holder still requires an actual device binding.

> Updated 2026-10-04. This document records the agreed commercial positioning and copy for future pages, product descriptions and checkout. This is a documentation update, not a change to live pricing, permissions or inventory. The historical $12 pack record below does not govern the new offer.

Latest decisions: all former path entry points lead to Initiation; its back link leads to Dashboard `/console`. The same page supports guests, unpaid accounts, Initiation buyers and legacy $12 buyers, including personal package progress. Rewrite all Device introductions and FAQs, add explicit NPC membership-batch selection, and remove Device / Worlds chat. A paid-user publishing feed is a later phase. These are requirements, not a claim that implementation is complete; see the rollout checklist.

## 1. Positioning and naming

Users pay **US$520** for **Voyager Initiation** to join Multiverse Collective as a **Voyager**, with physical packs, classified intel and member participation benefits. A Console claim is one included benefit. The device Claim entry should introduce the offer to non-members.

Initiation conveys formal acceptance and the beginning of exploration. Names, stories and content carry the mystery; prices, entitlements and delivery conditions remain explicit. Payment must not appear to begin an uncertain qualification process for benefits already purchased.

| Placement | Agreed wording | Meaning |
| --- | --- | --- |
| Member identity | Voyager | The identity acquired on joining |
| Paid offer / product name | Voyager Initiation | Joining and the included benefits |
| Page headline | Voyager Initiation | Name the initiation |
| Eyebrow | Become a Voyager | Lead with the member identity |
| Supporting headline copy | One initiation. A lasting place in the Collective. | Explain entry into the organization |
| Primary button | Become a Voyager · $520 | Explicit action and price |
| Physical benefits section | Voyager Packs | Physical deliveries included in the offer |
| First welcome pack | Initial Voyager Pack | Retain the existing name; distinguish it from the whole offer |

Voyager Membership is not the primary marketing name. Voyager Access and Voyager Pass are not the selected names. Avoid Begin Initiation · $520 on the button because it may imply payment only starts an assessment. Membership fee can explain the charge, but is not the headline. Initiation is confirmed as a one-time payment with no renewal fee. Use: Pay once to become a Voyager. No recurring membership fee.

## 2. Public-facing copy

Replace the remaining-seat placeholder with verified offer inventory before publication.

> **BECOME A VOYAGER**
>
> One initiation. A lasting place in the Collective.
>
> Join the Collective to receive physical packs, read classified intel, and take part in member-only activities.
>
> **BECOME A VOYAGER · $520**
>
> First release: 100 seats · {remaining} seats remaining

The first release refers to this offer, not the first 100 members in the organization's history. More seats may be released later; do not claim membership is permanently limited to 100 people.

## 3. Three benefit categories

| Category | Contents | Delivery or access |
| --- | --- | --- |
| Physical rewards | First pack: welcome letter and member badge; second: mysterious components; third: Multiverse Console | Fulfilled on the seat cohort's schedule; the device is a member claim entitlement |
| Planned physical reward | A fourth pack, contents to be announced | Contents remain unannounced; dispatch is set for January 2027 |
| Information access | Read classified intel | Corresponding content access on joining, with updates as actual content is published |
| Participation | Member-only votes and priority participation in world records | Available by activity; the exact priority mechanism remains undecided |

Shipment dates follow a relatively fixed schedule anchored to the cohort's seat-release date, not a new countdown from each member's purchase. First-release dispatch months are confirmed: pack 1 **October 2026**, pack 2 **November 2026**, pack 3 **December 2026**, and pack 4 **January 2027**. Show each month beside its pack; these are dispatch months, not arrival dates. Distinguish the cohort schedule from individual tracking. Later seat releases must specify the applicable cohort and catch-up or shipment arrangements.

Information and participation provide ongoing value, without promising unlimited generation, unlimited parcels or all future expansions free. Early access windows and reserved capacity are candidate priority mechanisms, not finalized rules.

### One-time initiation and lasting access

Page copy: **One initiation. A lasting place in the Collective.** Alongside **Pay once to become a Voyager. No recurring membership fee.**

- US$520 is a one-time initiation fee, with no recurring membership fee. Voyager identity and S26 batch affiliation are retained without renewal.
- This initiation includes four physical packs, including one Console claim, on the published batch schedule. It does not include unlimited ongoing shipments.
- Classified intel access continues as the Collective publishes material. Member-only voting and priority activity eligibility continue, subject to each activity's rules.
- Future devices, packs and special projects must state separately whether they are included; they are not automatically free. Do not describe the offer as unlimited lifetime benefits.

## 4. Introduction and join action

Center the page on becoming a Voyager. Treat the introduction, price, join button and remaining seats as one coherent area instead of an isolated payment card. On wider screens the action can sit beside the introduction; on phones prefer below it in the reading flow.

Suggested order: **Voyager introduction and joining → Voyager Packs → Classified intel → Participation**. Physical and digital sections can exchange order; an entry from intel or voting can prioritize that benefit. This is a content structure requirement, not a request for a user-facing sorting control.

- Show the three packs and planned fourth pack in a complete illustrated timeline, with contents and cohort schedule.
- Show information value through actual report titles, summaries and reading actions.
- Show participation through concrete questions, eligibility and actions; remove decorative icon rows, repetitive explanations and generic slogans.
- Keep price and seat details together. Remaining seats must use this offer's real inventory, not display-oriented site member statistics.

The first batch is **S26**, emphasized before the seat limit. An exclamation button beside Limit opens the batch description with its 100-seat capacity and four dispatch months. Signal Calibration uses a headerless dialog with a standalone top-right close button.

### Signal Calibration prerequisite

The page is Voyager Initiation at `/voyager-initiation`, initially for signed-in, unpaid users. The primary button reads Become a Voyager · $520. Small text and a read-only square beneath the button show Signal Calibration status; a check appears on completion and cannot be manually toggled.

Clicking Become before completion opens a secondary dialog reusing the current `/quiz` five-question flow and server-saved completion record. A successful save updates the check; closing returns to initiation. The next Become click checks completion again on the server. Calibration does not charge or reserve a seat. Accounts that completed the current quiz version do not repeat it. Wrong answers retain the original answer-review flow; no new score or exam threshold is introduced.

## 5. Decisions required before launch

- New $12 Initial Voyager Pack sales are stopped. Existing buyers pay an additional $400 to complete Initiation, with $520 shown struck through; digital access and the first two Packs remain included. See the latest policy below.
- Fourth-pack contents; shipping fees, taxes, delivery regions and support terms for all packs. First-release dispatch months are confirmed above.
- Specific scope and pricing of future paid additions, to be stated when released.
- The exact world-record priority mechanism and shipment arrangements for later seat releases.
- Device supply and fulfillment for 100 seats: the existing [Kyoto One release record](../../releases/kyoto-one/README.md) specifies 50 units, not evidence of 100 available devices.
- Page, checkout product, seat counting and entitlement implementation and verification are separate work.

## Legacy $12 buyers: provisional members and Continue Initiation

Confirmed 2026-10-06. This supersedes the former one-Pack-only / undecided-upgrade policy. The dedicated page now displays the price, discount explanation and first-two-Pack not-yet-dispatched state. Checkout and entitlement data have not yet been changed. Personal tracking of the first two Packs is explicitly deferred.

- Legacy paid buyers are provisional members. They retain classified Intel, member voting and the same other digital member benefits.
- They own Pack 1 (Initial Voyager Pack) and Pack 2 (Mysterious Widgets), but not Pack 3 (Multiverse Console) or Pack 4. They cannot claim a Console before completing Initiation.
- Charge **an additional US$400 once** to complete Initiation. Show **~~$520~~ $400**, with $400 emphasized and **CONTINUE INITIATION · $400** as the action. This is not a $520-minus-$12 formula.
- Use the same Initiation page with a dedicated legacy state: distinguish already-owned benefits from the Console/fourth Pack unlocked after completion. Device Claim prompts them to continue Initiation and navigates only after confirmation.
- First-two-Pack tracking belongs on Initiation and is deferred. Preserve real existing fulfillment when upgrading, and avoid creating duplicate shipments. Do not invent tracking progress.
- Do not add an expiry date, urgency timer or digital-access cutoff to the provisional state.
- Verify historical payment eligibility server-side. The dedicated legacy price, current $520-only database constraint and webhook amount verification must be updated together before charging $400.
- Whether provisional members occupy S26 capacity before completion and how old batch/member numbers migrate remain undecided; do not automatically enroll all historic buyers into S26.

See the [saved launch checklist](launch-checklist.zh.md).

## 6. Historical record: $12 Initial Voyager Pack

The following preserves the earlier offer and implementation notes for reference. Statements such as current, live and pending refer to the time of that record, not a fresh verification. Legacy US-only, shipping-included terms do not automatically apply to the new offer.

### 1. Positioning

Commerce centers on a **one-time, physical+digital hybrid pack** — pay **$12** to become a Voyager and
get an "Initial Voyager Pack" shipped to you. It frames "paying" as a *ritual of being formally
accepted by the org and receiving membership materials*, not a cold subscription. Showcase page:
**`/voyager-pack`** (a long-scroll iframe product page).

### 2. Locked product decisions

- **$12 includes shipping, US-only** (Stripe `shipping_address_collection.allowed_countries=['US']`), one-time purchase.
- **Paying grants role=voyager, identical rights to a granted-device voyager** (incl. classified intel, signal participation).
- Phase 1 **manual fulfillment**; no extra fields collected pre-payment; transactional email reuses Supabase (new accounts via inviteUserByEmail).
- Current batch `2026 Batch S2`.

### 3. Pack contents (5 items, copy finalized)

1. Welcome Letter
2. Voyager Badge
3. Mysterious Component Parts (label says RANDOM PICK)
4. Voyager Status (digital benefits: Batch Seat→`/voyagers`, Inner Circle Access→`/vote`)
5. Priority Match Access

> 1–3 are physically shipped, 4–5 are digital and instant.

### 4. Purchase flow

```
/voyager-pack (CTA varies by state) ──► /api/checkout ──► Stripe Checkout (US-only) ──► webhook ──► provision + record order
```

- **Four CTA states** (the page body is never overlaid; only the bottom button changes):
  - `buy`: orange → `/api/checkout` (Stripe).
  - `tasks`: `task_gated` experiment group with incomplete tasks → "Complete Tasks to Purchase" → `/voyager-path`.
  - `closed`: sales not open → grey button + "launch pending" dialog.
  - `voyager`: already a Voyager → grey-green button + "already active" dialog.
- **Without Stripe keys**: `/api/checkout` enters **mock mode**, simulating payment and running the full chain for testing.
- **Webhook** (`/api/stripe/webhook`): verify → find/create account → record order address →
  `provisionVoyagerMembership`; `charge.refunded` → refund handling.

### 5. Orders & fulfillment

- `voyager_orders` table: Stripe fields + US address + shipping tracking (carrier / tracking_number /
  tracking_url / shipped_at / delivered_at), RLS readable only by the owner.
- **Profile fulfillment timeline**: a four-step `paid → preparing → shipped → delivered` tracker + tracking link (see 01).
- **Admin `/admin/orders`**: Architects enter carrier/tracking, advance status (drives tracking emails);
  also **create orders manually** (`createOrderManually`, for offline/gift/testing — idempotent and auto-provisions).

### 6. Batch

The `batches` table (single `is_current`). On upgrade the player joins the current batch and gets a
member number. Historical = `Original Batch`, current = `2026 Batch S2`. Batches carry the
"membership seat / limited-run" narrative.

### 7. Data & permissions

| Item | Notes |
|---|---|
| `voyager_orders` | order + address + shipping; RLS owner read, architect read-all |
| `batches` | batches, single is_current |
| `provision_voyager(uuid)` | atomic upgrade RPC (never downgrades architect) |
| Price | `PACK_PRICE_CENTS = 1200` (`src/lib/stripe.ts`) |
| Sales switch | `SALES_OPEN` constant (keep in sync across console / voyager-pack / api/checkout) |

### 8. Current status & gaps

- ✅ Product page, four-state CTA, Stripe checkout (with mock), webhook, orders, fulfillment timeline, admin order entry, manual orders, batches are live.
- ⬜ Refund-driven role downgrade not implemented.
- ⬜ Purchase-confirmation email for existing accounts pending.
- 🟡 US-only shipping; no i18n / multi-SKU yet.

### 9. Future hooks

- Multi-SKU / tag binding (World Builder Pack vs Device Seeker Pack).
- Repeat purchase / upgrade packs; limited batches and "early Console unlock (discount)" tied to the points system.


[全站切换实施清单 / Site rollout checklist](initiation-rollout.zh.md)

## Current highest priorities and shipping entry

2026-10-06: formal payments, Device claim completion, NPC enrollment management, unified access, and shipping/aftercare are the five highest priorities. Collect shipping details within Stripe Checkout when charging $520, following the former Device purchase flow; the $400 continuation uses the same approach. Device Claim reuses the confirmed address. Legacy buyers retain first-two-Pack shipping rights even without upgrading. The [aftercare draft](shipping-aftercare-draft.zh.md) is not published checkout terms; the [launch checklist](launch-checklist.zh.md) tracks implementation and outstanding commercial decisions.
