'use client'

import { useEffect } from 'react'
import { getPlatform } from '@/lib/platform'

// Registers the service worker (/sw.js) on the web and in installed PWAs. Skipped
// in the Capacitor native shell, which manages its own assets. The SW powers
// installability ("Add to Home screen") and Web Push — see docs/cross-platform.md.
export function PwaRegister() {
  useEffect(() => {
    if (getPlatform().isNative) return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // registration failures are non-fatal — the site still works as a page
      })
    }
    if (document.readyState === 'complete') {
      register()
      return
    }
    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
