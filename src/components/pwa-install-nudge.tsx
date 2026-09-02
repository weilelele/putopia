'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import posthog from 'posthog-js'
import { usePwaInstall } from '@/components/pwa-provider'
import {
  PWA_INSTALL_NUDGE_DECLINE_MS,
  PWA_INSTALL_NUDGE_DEFER_MS,
  deferPwaInstallNudge,
  getPwaInstallNudgeSource,
  readPwaInstallNudgeState,
  recordPwaInstallNudgeVisit,
  shouldShowPwaInstallNudge,
  type PwaInstallNudgeSource,
  type PwaInstallNudgeState,
  writePwaInstallNudgeState,
} from '@/lib/pwa-install-nudge'

const ENGAGEMENT_DELAY_MS = 4_000
const DASHBOARD_SCROLL_THRESHOLD = 0.25

export function PwaInstallNudge({
  eligibleUser,
  scrollContainer,
}: {
  eligibleUser: boolean
  scrollContainer: RefObject<HTMLElement | null>
}) {
  const { canInstall, promptInstall } = usePwaInstall()
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const stateRef = useRef<PwaInstallNudgeState | null>(null)
  const sourceRef = useRef<PwaInstallNudgeSource>('engaged_dashboard')
  const engagedRef = useRef(false)
  const timedOutRef = useRef(false)
  const configuredRef = useRef(false)

  useEffect(() => {
    if (!canInstall || !eligibleUser || configuredRef.current) return
    configuredRef.current = true

    const current = readPwaInstallNudgeState()
    const source = getPwaInstallNudgeSource(current)
    stateRef.current = recordPwaInstallNudgeVisit(current)
    sourceRef.current = source
    writePwaInstallNudgeState(stateRef.current)

    const maybeShow = () => {
      const state = stateRef.current
      if (!state || visible) return
      const shouldShow = shouldShowPwaInstallNudge({
        state,
        now: Date.now(),
        eligible: canInstall && eligibleUser,
        engaged: engagedRef.current && timedOutRef.current,
        source,
      })
      if (shouldShow) {
        setVisible(true)
        posthog.capture('pwa_install_nudge_shown', { source })
      } else if (state.installed || (state.deferUntil && state.deferUntil > Date.now())) {
        posthog.capture('pwa_install_nudge_suppressed', {
          reason: state.installed ? 'installed' : 'deferred',
          source,
        })
      }
    }

    const timeout = window.setTimeout(() => {
      timedOutRef.current = true
      maybeShow()
    }, ENGAGEMENT_DELAY_MS)

    const container = scrollContainer.current
    const onScroll = () => {
      if (!container) return
      const scrollableHeight = container.scrollHeight - container.clientHeight
      if (scrollableHeight > 0 && container.scrollTop / scrollableHeight >= DASHBOARD_SCROLL_THRESHOLD) {
        engagedRef.current = true
        maybeShow()
      }
    }
    container?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.clearTimeout(timeout)
      container?.removeEventListener('scroll', onScroll)
    }
  }, [canInstall, eligibleUser, scrollContainer, visible])

  const defer = (durationMs: number, action: 'not_now' | 'close' | 'native_dismissed') => {
    const current = stateRef.current
    if (current) {
      stateRef.current = deferPwaInstallNudge(current, Date.now(), durationMs)
      writePwaInstallNudgeState(stateRef.current)
    }
    setVisible(false)
    posthog.capture('pwa_install_nudge_deferred', { source: sourceRef.current, action })
  }

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const outcome = await promptInstall()
      if (outcome === 'dismissed') defer(PWA_INSTALL_NUDGE_DECLINE_MS, 'native_dismissed')
    } finally {
      setInstalling(false)
    }
  }

  if (!visible || !canInstall) return null

  return (
    <aside
      aria-label="Install Multiverse on Android"
      role="dialog"
      style={{
        position: 'fixed',
        zIndex: 55,
        left: 'max(0.75rem, env(safe-area-inset-left))',
        right: 'max(0.75rem, env(safe-area-inset-right))',
        bottom: 'calc(5.6rem + env(safe-area-inset-bottom))',
        maxWidth: 520,
        margin: '0 auto',
        padding: '0.9rem 1rem',
        border: '1px solid var(--bd-cyan-2)',
        background: 'rgba(15, 20, 48, 0.98)',
        boxShadow: '0 0 32px rgba(227,82,5,0.2)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      <button
        type="button"
        aria-label="Close install invitation"
        onClick={() => defer(PWA_INSTALL_NUDGE_DEFER_MS, 'close')}
        style={{ position: 'absolute', top: 7, right: 9, border: 0, background: 'transparent', color: 'var(--color-star-dim)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
      >
        ×
      </button>
      <div style={{ paddingRight: '1.4rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--color-nucleus)' }}>
        KEEP THE CONSOLE WITHIN REACH
      </div>
      <p style={{ margin: '0.45rem 0 0.8rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', lineHeight: 1.5, color: 'var(--color-star-dim)' }}>
        Add Multiverse to your home screen for a focused, standalone launch.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.8rem' }}>
        <button type="button" onClick={() => defer(PWA_INSTALL_NUDGE_DEFER_MS, 'not_now')} style={{ border: 0, background: 'transparent', color: 'var(--color-star-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', cursor: 'pointer' }}>
          NOT NOW
        </button>
        <button type="button" className="btn-primary" disabled={installing} onClick={handleInstall} style={{ minHeight: 40, padding: '0.55rem 0.9rem', opacity: installing ? 0.6 : 1 }}>
          {installing ? 'OPENING…' : 'INSTALL'}
        </button>
      </div>
    </aside>
  )
}
