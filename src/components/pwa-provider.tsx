'use client'

import posthog from 'posthog-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  PWA_OFFLINE_VIEW_PENDING_KEY,
  type BeforeInstallPromptEvent,
  type InstallPromptOutcome,
} from '@/types/pwa'
import { isIOSNativeApp } from '@/lib/app-platform'
import { getInstallPlatform, type InstallPlatform } from '@/lib/android-install'

interface PwaContextValue {
  canInstall: boolean
  platform: InstallPlatform
  isInstalled: boolean
  promptInstall: (source?: string) => Promise<InstallPromptOutcome | null>
}

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  platform: 'unknown',
  isInstalled: false,
  promptInstall: async () => null,
})

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent)
}

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia('(display-mode: standalone)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
function readPlatform() { return getInstallPlatform(navigator.userAgent, isStandaloneDisplay()) }
function serverPlatform(): InstallPlatform { return 'unknown' }

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const prompting = useRef(false)
  const platform = useSyncExternalStore(subscribeToDisplayMode, readPlatform, serverPlatform)

  useEffect(() => {
    if (isIOSNativeApp(navigator.userAgent)) return

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
      setInstalled(false)
      setInstallPrompt(promptEvent)
      posthog.capture('pwa_install_available')
    }

    const handleInstalled = () => {
      setInstallPrompt(null)
      setInstalled(true)
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

  const promptInstall = useCallback(async (source = 'dashboard') => {
    if (!installPrompt || prompting.current || isStandaloneDisplay()) return null
    prompting.current = true
    // A browser prompt is single-use, including after dismissal or failure.
    setInstallPrompt(null)
    try {
      posthog.capture('pwa_install_clicked', { source })
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      posthog.capture(choice.outcome === 'accepted' ? 'pwa_install_accepted' : 'pwa_install_dismissed', { platform: choice.platform, source })
      return choice.outcome
    } finally { prompting.current = false }
  }, [installPrompt])

  const value = useMemo(() => ({
    canInstall: installPrompt !== null,
    platform,
    isInstalled: installed || platform === 'app',
    promptInstall,
  }), [installPrompt, promptInstall, platform, installed])

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}

export function usePwaInstall() {
  return useContext(PwaContext)
}
