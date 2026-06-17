# 10 · Commerce: Voyager Pack

## 1. Positioning

Commerce centers on a **one-time, physical+digital hybrid pack** — pay **$12** to become a Voyager and
get an "Initial Voyager Pack" shipped to you. It frames "paying" as a *ritual of being formally
accepted by the org and receiving membership materials*, not a cold subscription. Showcase page:
**`/voyager-pack`** (a long-scroll iframe product page).

## 2. Locked product decisions

- **$12 includes shipping, US-only** (Stripe `shipping_address_collection.allowed_countries=['US']`), one-time purchase.
- **Paying grants role=voyager, identical rights to a granted-device voyager** (incl. classified intel, signal participation).
- Phase 1 **manual fulfillment**; no extra fields collected pre-payment; transactional email reuses Supabase (new accounts via inviteUserByEmail).
- Current batch `2026 Batch S2`.

## 3. Pack contents (5 items, copy finalized)

1. Welcome Letter
2. Voyager Badge
3. Mysterious Component Parts (label says RANDOM PICK)
4. Voyager Status (digital benefits: Batch Seat→`/voyagers`, Inner Circle Access→`/vote`)
5. Priority Match Access

> 1–3 are physically shipped, 4–5 are digital and instant.

## 4. Purchase flow

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

## 5. Orders & fulfillment

- `voyager_orders` table: Stripe fields + US address + shipping tracking (carrier / tracking_number /
  tracking_url / shipped_at / delivered_at), RLS readable only by the owner.
- **Profile fulfillment timeline**: a four-step `paid → preparing → shipped → delivered` tracker + tracking link (see 01).
- **Admin `/admin/orders`**: Architects enter carrier/tracking, advance status (drives tracking emails);
  also **create orders manually** (`createOrderManually`, for offline/gift/testing — idempotent and auto-provisions).

## 6. Batch

The `batches` table (single `is_current`). On upgrade the player joins the current batch and gets a
member number. Historical = `Original Batch`, current = `2026 Batch S2`. Batches carry the
"membership seat / limited-run" narrative.

## 7. Data & permissions

| Item | Notes |
|---|---|
| `voyager_orders` | order + address + shipping; RLS owner read, architect read-all |
| `batches` | batches, single is_current |
| `provision_voyager(uuid)` | atomic upgrade RPC (never downgrades architect) |
| Price | `PACK_PRICE_CENTS = 1200` (`src/lib/stripe.ts`) |
| Sales switch | `SALES_OPEN` constant (keep in sync across console / voyager-pack / api/checkout) |

## 8. Current status & gaps

- ✅ Product page, four-state CTA, Stripe checkout (with mock), webhook, orders, fulfillment timeline, admin order entry, manual orders, batches are live.
- ⬜ Refund-driven role downgrade not implemented.
- ⬜ Purchase-confirmation email for existing accounts pending.
- 🟡 US-only shipping; no i18n / multi-SKU yet.

## 9. Future hooks

- Multi-SKU / tag binding (World Builder Pack vs Device Seeker Pack).
- Repeat purchase / upgrade packs; limited batches and "early Console unlock (discount)" tied to the points system.
