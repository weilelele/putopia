'use client'

import posthog from 'posthog-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  PWA_OFFLINE_VIEW_PENDING_KEY,
  type BeforeInstallPromptEvent,
  type InstallPromptOutcome,
} from '@/types/pwa'

interface PwaContextValue {
  canInstall: boolean
  promptInstall: () => Promise<InstallPromptOutcome | null>
}

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  promptInstall: async () => null,
})

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent)
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch((error: unknown) => {
        console.error('[pwa] Service worker registration failed:', error)
      })
    }

    if (isStandaloneDisplay()) {
      posthog.capture('pwa_standalone_launched')
    }

    const flushPendingOfflineView = () => {
      if (!navigator.onLine) return
      try {
        const viewedAt = localStorage.getItem(PWA_OFFLINE_VIEW_PENDING_KEY)
        if (!viewedAt) return
        posthog.capture('pwa_offline_viewed', { offline_viewed_at: viewedAt })
        localStorage.removeItem(PWA_OFFLINE_VIEW_PENDING_KEY)
      } catch {
        // Storage can be unavailable in private browsing; PWA use remains unaffected.
      }
    }

    flushPendingOfflineView()

    const handleInstallAvailable = (event: Event) => {
      if (!isAndroidDevice() || isStandaloneDisplay()) return
      const promptEvent = event as BeforeInstallPromptEvent
      promptEvent.preventDefault()
      setInstallPrompt(promptEvent)
      posthog.capture('pwa_install_available')
    }

    const handleInstalled = () => {
      setInstallPrompt(null)
      posthog.capture('pwa_installed')
    }

    window.addEventListener('beforeinstallprompt', handleInstallAvailable)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', flushPendingOfflineView)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', flushPendingOfflineView)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installPrompt || isStandaloneDisplay()) return null

    posthog.capture('pwa_install_clicked')
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    const outcome = choice.outcome

    posthog.capture(
      outcome === 'accepted' ? 'pwa_install_accepted' : 'pwa_install_dismissed',
      { platform: choice.platform },
    )
    setInstallPrompt(null)
    return outcome
  }, [installPrompt])

  const value = useMemo(() => ({
    canInstall: installPrompt !== null,
    promptInstall,
  }), [installPrompt, promptInstall])

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}

export function usePwaInstall() {
  return useContext(PwaContext)
}
