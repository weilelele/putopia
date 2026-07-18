'use client'

import { useEffect } from 'react'
import { getCapacitor, getPlatform } from '@/lib/platform'

// Bridges native deep links (iOS Universal Links / Android App Links) into the
// remote-URL WebView. On the web this is a no-op. When the OS opens the app via
// an https://multiverseco.org link (e.g. an auth callback), we route the WebView
// to that path so the existing /auth/callback logic runs in-app, not in Safari.
//
// Runtime detection and Capacitor access go through @/lib/platform — see
// docs/cross-platform.md.

interface CapacitorAppPlugin {
  addListener(
    eventName: 'appUrlOpen',
    listener: (event: { url: string }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void }
}

export function NativeBridge() {
  useEffect(() => {
    if (!getPlatform().isNative) return
    const plugins = getCapacitor()?.Plugins as
      | { App?: CapacitorAppPlugin }
      | undefined
    const appPlugin = plugins?.App
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
