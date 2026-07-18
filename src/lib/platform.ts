/**
 * Single source of truth for "which runtime am I in?".
 *
 * The same Next.js site is loaded three ways:
 *   - web      — a normal browser tab
 *   - ios-native   — Capacitor WKWebView (App Store app), loads server.url
 *   - android-pwa  — installed PWA (home-screen icon, standalone window)
 * (plus the edge cases ios-pwa / android-native, handled for completeness).
 *
 * THE RULE: feature code branches on CAPABILITIES (canNativePush,
 * storePaymentRestricted, …), never on the platform name. New runtimes or
 * capability shifts then change ONE place — here. Raw `window.Capacitor` /
 * `navigator.standalone` / `matchMedia('(display-mode: …)')` checks in
 * src/app and src/components are blocked by the `platform/no-raw-platform-check`
 * ESLint rule; route everything through this module instead.
 *
 * See docs/cross-platform.md for the full divergence registry.
 */

import { useSyncExternalStore } from 'react'

export type PlatformOS = 'ios' | 'android' | 'unknown'

export type PlatformRuntime =
  | 'ios-native'
  | 'android-native'
  | 'ios-pwa'
  | 'android-pwa'
  | 'web'

export interface PlatformInfo {
  runtime: PlatformRuntime
  os: PlatformOS
  /** Running inside a Capacitor native shell (WKWebView / Android WebView). */
  isNative: boolean
  /** Installed PWA in a standalone window (no browser chrome). */
  isStandalone: boolean
  /** Launched from a home-screen icon — native shell OR installed PWA. */
  isInstalled: boolean

  // ---- capabilities: branch on THESE, never on `os` / `runtime` directly ----
  /** Push via the native channel (Capacitor → APNs/FCM). */
  canNativePush: boolean
  /** Push via the web channel (Service Worker + Push API, VAPID). */
  canWebPush: boolean
  /** App-store IAP rules apply — Stripe/web checkout may be rejected at review. */
  storePaymentRestricted: boolean
  /** Layout must honour safe-area insets (notch / home indicator). */
  usesSafeArea: boolean
  /** External links should open in the system browser, not navigate in place. */
  externalLinksOpenInSystemBrowser: boolean
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  Plugins?: Record<string, unknown>
}

/** Typed access to the Capacitor global — the ONLY place that touches it. */
export function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null
}

const SERVER_DEFAULT: PlatformInfo = {
  runtime: 'web',
  os: 'unknown',
  isNative: false,
  isStandalone: false,
  isInstalled: false,
  canNativePush: false,
  canWebPush: false,
  storePaymentRestricted: false,
  usesSafeArea: false,
  externalLinksOpenInSystemBrowser: false,
}

function detectOS(cap: CapacitorGlobal | null): PlatformOS {
  const native = cap?.getPlatform?.()
  if (native === 'ios') return 'ios'
  if (native === 'android') return 'android'
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  // iPadOS 13+ reports a desktop Safari UA; the touch check disambiguates it.
  const isIPadOS =
    /Macintosh/i.test(ua) && typeof window !== 'undefined' && 'ontouchend' in window
  if (/iPhone|iPad|iPod/i.test(ua) || isIPadOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'unknown'
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const displayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  // iOS Safari predates the display-mode media feature.
  const iosLegacy =
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return Boolean(displayMode || iosLegacy)
}

/** Compute the current platform. SSR-safe: returns the web default on server. */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') return SERVER_DEFAULT

  const cap = getCapacitor()
  const isNative = Boolean(cap?.isNativePlatform?.())
  const os = detectOS(cap)
  const isStandalone = !isNative && detectStandalone()
  const isInstalled = isNative || isStandalone

  let runtime: PlatformRuntime
  if (isNative) runtime = os === 'android' ? 'android-native' : 'ios-native'
  else if (isStandalone) runtime = os === 'ios' ? 'ios-pwa' : 'android-pwa'
  else runtime = 'web'

  const canWebPush =
    !isNative &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  return {
    runtime,
    os,
    isNative,
    isStandalone,
    isInstalled,
    canNativePush: isNative,
    canWebPush,
    // Apps distributed through the App Store / Play Store fall under IAP rules;
    // a PWA / browser does not. We only ship iOS natively, but keep this true
    // for any native shell so the payment branch stays correct if that changes.
    storePaymentRestricted: isNative,
    usesSafeArea: isInstalled,
    externalLinksOpenInSystemBrowser: isNative,
  }
}

// ---- React binding via useSyncExternalStore (no hydration mismatch, no
//      set-state-in-effect) -----------------------------------------------

let snapshot: PlatformInfo | null = null

function getSnapshot(): PlatformInfo {
  if (typeof window === 'undefined') return SERVER_DEFAULT
  if (!snapshot) snapshot = detectPlatform()
  return snapshot
}

function getServerSnapshot(): PlatformInfo {
  return SERVER_DEFAULT
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mql = window.matchMedia('(display-mode: standalone)')
  const handler = () => {
    snapshot = null // installing/uninstalling flips standalone — recompute
    onChange()
  }
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}

/** Reactive platform read for client components. */
export function usePlatform(): PlatformInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Non-reactive read for effects / non-React modules (deep-link bridge, notify). */
export function getPlatform(): PlatformInfo {
  return getSnapshot()
}

/** Exhaustiveness guard for `switch (platform.runtime)` blocks. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled platform runtime: ${String(value)}`)
}
