# Multiverse Collective — Design System (Single Source of Truth)

> **This file is authoritative.** When you need the design spec — colors, fonts,
> tokens, component conventions — read THIS, not scattered notes or guesses.
> All canonical values below are defined once in `src/app/globals.css` and are
> consumed by shared components. Page files must not redefine brand tokens.
>
> **Canonical token system = `--color-*` + `--bd-*` + `--font-mono` + `--fs-*` + `--s-*`.**
> New code MUST use these. Several parallel/legacy token sets also exist in
> `:root` and resolve to the same values — they are **DEPRECATED** (see bottom).
> Do not introduce new usages of them.
>
> The Style A visual system is implemented in `src/app/visual-refresh.css`, which
> is imported after `globals.css`. It owns presentation only: it must not redefine
> canonical tokens, route structure, business logic, component content, or data
> contracts.

---

## 1. Brand palette (from VI guidelines)

The brand is **orange + deep space blue + off-white. No grey.** Secondary text =
white at reduced opacity, never a grey-blue.

| Role | Hex | Canonical token |
|------|-----|-----------------|
| Pantone 1665 C screen orange — primary / logo / active / CTA | `#E35205` | `--color-nucleus` |
| Burnt Orange — hover / border / divider / accent | `#C84406` | `--color-burnt` (alias `--color-nebula`) |
| Deep Orange — pressed / emphasis | `#A92F06` | `--color-nucleus-3` |
| Deep Space Blue — **page background** | `#080C20` | `--color-deep` |
| Off White — **body text** | `#F5F5F5` | `--color-star` |

Rule of thumb: Pantone 1665 C orange for logo/key/CTA · deep-space-blue background · white text
with orange accents · keep high contrast.

### Protected brand and product assets

- `public/assets/vi-icon.png` is the canonical graphic logo.
- `public/assets/vi-wordmark.png` is the canonical wordmark.
- `public/assets/device-console.jpg` is the canonical device photograph.
- `src/components/flip-wordmark.tsx` owns the wordmark presentation animation.
- `src/components/archive-brand-header.tsx` is the shared static brand masthead.

Do not redraw, recolor, crop, filter, regenerate, or replace these assets. New
visual treatments belong on their surrounding frame, caption, or layout—not on
the image pixels or animation sequence.

`src/components/brand-logo.tsx` is a legacy code-drawn approximation. Do not use
it for new Style A surfaces; migrate callers to the canonical image assets.

---

## 2. Canonical tokens (use these)

### Color — brand & text
```
--color-nucleus    #E35205   primary / CTA / active / logo
--color-nucleus-2  #F2783E   lighter highlight
--color-nucleus-3  #A92F06   deep orange (pressed / emphasis)
--color-burnt      #C84406   burnt orange (hover / border / accent)
--color-nebula     #C84406   = --color-burnt (kept as alias; prefer --color-burnt)
--color-star       #F5F5F5   primary text (off-white)
--color-star-dim   rgba(245,245,245,0.55)   secondary text  (NOT grey)
--color-star-deep  rgba(245,245,245,0.35)   faint text / faint border
```

### Color — surfaces
```
--color-deep   #080C20   page background (deep space blue)
--color-void   #10162D   panel / card surface
```
Note: two more surface shades appear frequently **inline** (no clean `--color-*`):
`#0C1228` (elevated panel / input fill) and `#121A35` (card above panel). If you
need them, the surface tokens `--bg-panel` (#0C1228) and `--bg-card` (#121A35)
exist and are the **one acceptable exception** to "avoid the semantic layer",
because `--color-*` has no equivalent. Prefer them over hardcoding the hex.

### Color — signal (status only, NOT brand/structure/text)
```
--color-ok     #20D890   active / success
--color-warn   #FFB020   warning
--color-fault  #E83030   error
```

### Borders
```
--bd-orange  rgba(227,82,5,0.62)   strong orange border
--bd-cyan    rgba(227,82,5,0.48)   medium orange border  ⚠ name says "cyan" but it is ORANGE (legacy)
--bd-cyan-2  rgba(227,82,5,0.24)   subtle orange border  ⚠ also ORANGE
--bd-faint   rgba(245,245,245,0.10) faint white hairline
```

### Typography
```
--font-mono     Courier Prime  (next/font/google, weights 400/700; fallback 'Courier New')
--font-display  = var(--font-mono)
--font-body     = var(--font-mono)
```
**The whole site is Courier Prime.** (It was briefly Space Mono early on — that is
outdated; do not write "Space Mono".)

Type scale: `--fs-display` `--fs-h1`(48) `--fs-h2`(32) `--fs-h3`(24) `--fs-title`(20)
`--fs-body`(16) `--fs-label`(13) `--fs-caption`(12, floor).

### Spacing · geometry
```
--s-1..--s-8   0.25rem → 4rem  (4/8/12/16/24/32/48/64px)
--radius       2px             (global corner radius)
--archive-notch 10px          (single top-right clipped corner)
```

Legacy glow tokens remain for unmigrated pages only. Style A components never
consume them.

---

## 3. Layout & viewport — portrait-first (DEFAULT)

> **~90% of users arrive on a phone in portrait.** Portrait mobile is the
> default design target, not an afterthought. Design, build, and verify every
> page at a narrow viewport FIRST; widescreen/landscape is progressive
> enhancement layered on top.

- **Mobile-first Tailwind.** Base (unprefixed) classes = portrait phone. Add
  `sm:`/`md:`/`lg:` only to *enhance* for wider screens — never the reverse. A
  page must be complete and usable with zero responsive prefixes.
- **Single column by default.** Multi-column / side-by-side layouts go behind
  `sm:`/`md:`. Wide tables and grids need a portrait plan (stack, horizontal
  scroll, or card view) — don't ship a desktop grid that overflows a phone.
- **Don't hide essential content on small screens.** The `hidden sm:block`
  pattern is fine for *decorative/secondary* extras (e.g. a card's side image),
  never for primary information or actions.
- **Touch, not hover.** Touch has no hover state — never make hover the *only*
  way to reveal info or an action. Keep interactive targets ≥ 44×44px.
- **Mind the mobile chrome.** Account for the address bar, the on-screen
  keyboard, and safe-area insets; avoid fixed elements that cover content or
  inputs.
- **The type floor matters most here.** `--fs-caption` (12px) is the floor on
  mobile too — enforced by `design-tokens/min-font-size` (see §2 type scale).
- **Verify in portrait first.** Check at ~390×844 before desktop — the branch
  preview URL opened on an actual phone is the gold standard.

---

## 4. Style A — Minimal Archive component conventions

- **Flat color only.** Components do not use color gradients, glass blur, bloom,
  bevel highlights, or decorative HUD tick rails. Depth comes from spacing,
  separators, and restrained surface contrast.
- **Buttons** (`.btn-primary` filled, `.btn-secondary` outline, `.btn-orange`/`.btn-amber`
  aliases of primary, `.btn-ghost` small/link): primary is solid Pantone 1665 C;
  secondary uses a warm off-white hairline; ghost is borderless unless it belongs
  to a bounded toolbar. Prominent controls use one 10px top-right clipped corner.
  Pressed state moves down 1px. Disabled primary retains its orange fill at 48%
  opacity; it never becomes grey.
- **Inputs** use a 1px warm off-white outline, dark fill, one 10px top-right clipped
  corner, and an orange focus outline. Labels sit above the field. Do not add ID/KY
  cells, faux encryption states, legends on the border, or glow.
- **Cards, dialogs, and `.hud-frame`** use a thin warm outline, dark flat surface,
  clean section separators, and at most one 10px top-right clipped corner.
- **Status and progress** use neutral outlined containers; orange/green/red is
  reserved for the status dot or active fill instead of coloring the whole frame.
- **Bottom navigation** is one outlined dock with thin vertical separators. Active
  icon and label turn orange; inactive items remain warm off-white at reduced opacity.
- Reusable classes live in `globals.css`: `.hud-frame`, `.label-tag`, `.card-void`,
  `.input-dark`, `.hud-field`, `.btn-*`, `.progress-track`/`.progress-fill`,
  `.status-pill`, `.hr-cyan` (orange), etc.

### Shared component source map

| Pattern | Canonical component |
|---|---|
| Static brand masthead | `ArchiveBrandHeader` |
| Button and link actions | `ArchiveButton`, `ArchiveLinkButton` |
| Labelled form control | `ArchiveField` |
| Page title with action/identity slots | `ArchivePageHeader` |
| Three-part metrics | `ArchiveStatStrip` |
| Horizontal selection | `ArchiveTabs` |
| Section heading | `ArchiveSectionLabel` |
| Flat content container | `ArchiveCard` |
| Navigable content card | `ArchiveLinkCard` |
| Administration navigation | `AdminNav` |

Legacy `.btn-*`, `.input-dark`, `.hud-field`, and `.card-*` classes remain as a
migration bridge. New or migrated pages should render the shared components.

### Golden page examples

`/ui-kit` contains three portrait-first, code-rendered page references under
**GOLDEN PAGE EXAMPLES**. They use the real Courier Prime font, canonical tokens,
production interaction states, and 390×844 reference frames. Treat them as
composition guidance, not page templates to copy wholesale:

| Example | Use it to guide | Structural lesson |
|---|---|---|
| Content discovery | World, device, log, and editorial indexes | One featured object, then lightweight rows; media establishes atmosphere while controls stay flat. |
| Focused participation | Signal, quiz, voting, application, and claim steps | One question or decision per view; progress, evidence, choice, then one primary action. |
| Identity and progress | Profile, onboarding status, membership, and path views | One current identity and next action; milestones share a sequence instead of becoming metric cards. |

Rendered portrait references used during review:

- `docs/design/golden-screen-01-world-records.png`
- `docs/design/golden-screen-02-signal-check.png`
- `docs/design/golden-screen-03-voyager-record.png`

All three examples intentionally share the same color, type, geometry, and
interaction grammar while using different information hierarchies. New work
should vary hierarchy and composition for the task before inventing new visual
decoration. The implementation lives in
`src/app/ui-kit/golden-screens.tsx` and its colocated CSS Module.

### New-interface delivery workflow

Every new or materially redesigned interface follows the same delivery path:

1. Start from one of the three golden-example information hierarchies and make
   the portrait 390×844 view complete before adding wider layouts.
2. Use shared archive components and canonical tokens. Do not copy a golden
   screen wholesale or create a route-local palette, font stack, button system,
   corner language, or decorative visual layer.
3. Verify default, loading, empty, error, disabled, focus, and completed states.
   One page has one primary action; touch targets are at least 44×44px.
4. Run `npm run design:check` before requesting review. The CI design gate checks
   only UI lines added by the PR, so legacy debt does not excuse new gradients,
   glow/shadows, blur, cyan, obsolete palette values, or non-Courier typography.
5. Attach a 390×844 screenshot to the PR and complete the Design review checklist.

Human review remains responsible for hierarchy, clarity, content, image choice,
and whether the single clipped corner is used with restraint; these qualities
cannot be decided reliably by a text scanner.

### Current Style A route coverage

The following user-facing routes consume the canonical archive primitives and
`visual-refresh.css`. Keep new work on these routes inside the shared system;
do not reintroduce route-local palettes, gradients, glow, or decorative HUD copy.

- Access and identity: `/login`, `/register`, `/auth/expired`, `/profile`
- Core archive: `/console`, `/voyagers`, `/worlds`, `/worlds/[id]`,
  `/devices`, `/devices/[id]`, `/logs`, `/logs/[id]`
- Participation: `/intel`, `/intel/[id]`, `/vote`, `/apply`, `/quiz`,
  `/voyager-path`, `/worlds/submit`, `/devices/claim`, `/signal`,
  `/voyager-pack`
- Conversion and creation: `/new`, `/join/success`, `/studio`
- Internal operations: `/admin/*`, `/newsletter/direct`,
  `/newsletter/task-gated`, `/newsletter/unregistered`
- Reference surface: `/ui-kit`

The shared desktop `Sidebar` and portrait `BottomNav` are also part of Style A.
They keep only destination, access, and identity information; decorative group
labels and simulated system-status copy are intentionally excluded.

Administration routes inherit their shell, responsive navigation, control
geometry, and table/form normalization from the `/admin` layout. New admin pages
must be added to `AdminNav` through that layout rather than introducing a second
page-local navigation system.

### Content discipline

- Interface copy describes a real action, destination, field, status, or value.
- Do not add decorative codes such as `EXEC 01`, `REQ 02`, `LOG 01`, `RECORD /`,
  fake coordinates, fake security notices, or `//` prefixes.
- A page may have one primary action. Secondary actions use outline or text styles.
- Keep existing business content, names, assets, and data. Remove only ornamental copy.
- Empty, loading, error, and disabled states use plain language and preserve layout.

---

## 5. DEPRECATED tokens — DO NOT USE (map to canonical)

These exist in `:root` and resolve to the same colors, so existing usages still
work — but they fragment the system and caused a bad "design spec" readout. **Do
not add new usages.** Map to the canonical token instead:

| Deprecated | = Canonical | Value |
|------------|-------------|-------|
| `--or-retro` | `--color-nucleus` | #E35205 |
| `--or-burnt` | `--color-burnt` | #C84406 |
| `--or-deep` | `--color-nucleus-3` | #A92F06 |
| `--tx-primary` | `--color-star` | #F5F5F5 |
| `--tx-muted` | `--color-star-dim` | rgba(245,245,245,.55) |
| `--tx-faint` | `--color-star-deep` | rgba(245,245,245,.35) |
| `--bg-base` | `--color-deep` | #080C20 |
| `--sig-ok` | `--color-ok` | #20D890 |
| `--sig-warn` | `--color-warn` (note value #E8A020 vs #FFB020 — see debts) | ~ |
| `--sig-fault` | `--color-fault` | #E83030 |
| `--nucleus-orange` | `--color-nucleus` | #E35205 |
| `--nebula-cyan` | `--color-burnt` | #C84406 |
| `--star-white` | `--color-star` | #F5F5F5 |
| `--void-grey` | `--color-void` | #10162D |
| `--deep-space` | `--color-deep` | #080C20 |
| `--border-subtle` | `--bd-faint` | rgba(245,245,245,.08) |
| `--text-muted` | `--color-star-dim` | (≈; value rgba .45 vs .55 — see debts) |
| `--text-dim` | `--color-star-deep` | (≈; value rgba .25 vs .35 — see debts) |
| `--color-cream` | `--color-star` | #F5F5F5 |

(`--bg-panel` #0C1228 / `--bg-card` #121A35 are the exception — keep for surfaces.)

---

## 6. Known naming debts (don't "fix" silently — they're load-bearing)

- `--bd-cyan` / `--bd-cyan-2` / `--glow-cyan` / `.hr-cyan` are **orange**, not cyan
  (the brand dropped cyan; names were kept to avoid a mass rename). Treat them as
  orange-border / orange-glow tokens.
- Duplicates of the same value: `--color-burnt` == `--color-nebula`,
  `--color-star` == `--color-cream`. Prefer the first of each pair.
- Slight value drift in some deprecated tokens (`--sig-warn` #E8A020 vs `--color-warn`
  #FFB020; `--text-muted` .45 vs `--color-star-dim` .55). Use the canonical value.

---

## 7. Why this doc exists

A "research the design spec" pass returned a Frankenstein list (`--or-retro`,
`--tx-primary`, `--bg-panel`, mixed with `--bd-faint`/`--font-mono`) because the
**memory documented the minority semantic layer (41 usages) as the spec**, while
components actually use `--color-*` (249 usages). This file is the reconciliation:
**`--color-*` is canonical; the rest is deprecated alias noise.** Keep this file in
sync with `globals.css` when tokens change.
