# Cross-platform (web + iOS app + Android PWA)

This is **one Next.js site loaded three ways**, not three codebases:

| Runtime        | How it loads                                              |
| -------------- | -------------------------------------------------------- |
| `web`          | a normal browser tab                                     |
| `ios-native`   | Capacitor WKWebView (App Store app), loads `server.url`  |
| `android-pwa`  | installed PWA — home-screen icon, standalone window      |

(`ios-pwa` / `android-native` are handled for completeness but aren't the
shipping targets.)

~99% of code — every page, component, server action, API route, and the whole
backend — is shared. Only the narrow boundary below diverges.

## The one rule

**Branch on capabilities, never on the platform name.**

```ts
import { usePlatform } from '@/lib/platform'   // client components
import { getPlatform } from '@/lib/platform'   // effects / non-React modules

// ✅ capability — survives a new runtime, changes in one place
if (platform.canNativePush) subscribeApns() else subscribeWebPush()

// ❌ platform name — spreads, rots, breaks the next time the matrix grows
if (isIOS) ...
```

All runtime detection lives in [`src/lib/platform.ts`](../src/lib/platform.ts) —
the single source of truth. Raw `window.Capacitor`, `navigator.standalone`, and
`matchMedia('(display-mode: …)')` checks in `src/app` / `src/components` are
**blocked by ESLint** (`platform/no-raw-platform-check`). Route everything
through the capabilities exposed by `PlatformInfo`.

When you `switch (platform.runtime)`, end with `assertNever(runtime)` so a new
runtime fails to type-check until every branch is handled.

## Divergence registry

The complete list of things that differ by runtime. Each should be driven by a
capability flag from `platform.ts`, with a graceful **web fallback** (worst case
= a normal working website).

| # | Concern              | Capability flag                      | web              | ios-native              | android-pwa                  | Status |
|---|----------------------|--------------------------------------|------------------|-------------------------|------------------------------|--------|
| 1 | Runtime detection    | `runtime` / `isNative` / `isStandalone` | `web`         | `ios-native`            | `android-pwa`                | ✅ done |
| 2 | Push notifications   | `canNativePush` / `canWebPush`       | in-app / email   | Capacitor → APNs        | Web Push (SW + VAPID/FCM)    | ⬜ todo |
| 3 | Auth return / deep link | (via deep-link bridge)            | normal redirect  | Universal Link → bridge | PWA `scope` link capture     | 🟡 partial (NativeBridge) |
| 4 | Payment compliance   | `storePaymentRestricted`             | Stripe web       | ⚠️ Apple IAP rules apply | Stripe web (no store cut)   | ⬜ todo |
| 5 | Safe-area / status bar | `usesSafeArea`                     | n/a              | env() insets            | env() insets                 | ⬜ todo |
| 6 | External links       | `externalLinksOpenInSystemBrowser`   | normal           | system browser          | normal                       | ⬜ todo |
| 7 | App update flow      | —                                    | deploy           | Capacitor assets / live | SW cache refresh prompt      | ⬜ todo |

## Verification matrix

Before shipping a change that touches the boundary, walk the critical flows
across all three runtimes (the boundary is where bugs hide — shared code is
covered by normal tests):

| Flow              | web | ios-native | android-pwa |
| ----------------- | --- | ---------- | ----------- |
| Login + return    |     |            |             |
| Stripe checkout   |     |            |             |
| Push subscribe/recv |   |            |             |
| Safe-area layout  |     |            |             |
| External link tap |     |            |             |
