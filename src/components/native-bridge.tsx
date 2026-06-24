'use client'

import { useEffect } from 'react'

// Bridges native deep links (iOS Universal Links / Android App Links) into the
// remote-URL WebView. Capacitor injects `window.Capacitor` on native; this is a
// no-op on the web. When the OS opens the app via an https://multiverseco.org
// link (e.g. an auth callback), we route the WebView to that path so the
// existing /auth/callback logic runs in-app instead of in Safari.

interface CapacitorAppPlugin {
  addListener(
    eventName: 'appUrlOpen',
    listener: (event: { url: string }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void }
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  Plugins?: { App?: CapacitorAppPlugin }
}

export function NativeBridge() {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
    if (!cap?.isNativePlatform?.()) return
    const appPlugin = cap.Plugins?.App
    if (!appPlugin) return

    let remove: (() => void) | undefined
    Promise.resolve(
      appPlugin.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url)
          const target = url.pathname + url.search + url.hash
          if (target && target !== '/') window.location.href = target
        } catch {
          // ignore malformed deep links
        }
      }),
    ).then((handle) => {
      remove = handle.remove
    })

    return () => {
      try {
        remove?.()
      } catch {
        // listener already detached
      }
    }
  }, [])

  return null
}
