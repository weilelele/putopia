'use client'

import { useEffect, useState } from 'react'
import { usePlatform } from '@/lib/platform'
import { useAuth } from '@/lib/auth-context'
import { subscribeToPush, hasActiveSubscription } from '@/lib/push/client'

type State = 'idle' | 'busy' | 'enabled' | 'denied' | 'error'

const MUTED = 'rgba(245,245,245,0.6)'

export function EnableNotifications() {
  const platform = usePlatform()
  const { user } = useAuth()
  const [state, setState] = useState<State>('idle')
  const [note, setNote] = useState<string | null>(null)

  // Reflect existing permission / subscription on mount (browser state read).
  useEffect(() => {
    let cancelled = false
    async function sync() {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied')
        return
      }
      if (await hasActiveSubscription()) {
        if (!cancelled) setState('enabled')
      }
    }
    sync().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    setState('busy')
    setNote(null)
    const result = await subscribeToPush()
    if (result.ok) {
      setState('enabled')
    } else if (result.reason === 'denied') {
      setState('denied')
    } else {
      setState('error')
      setNote(result.reason === 'unconfigured' ? 'Push is not configured.' : 'Could not enable notifications.')
    }
  }

  async function sendTest() {
    setNote(null)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      setNote(res.ok ? 'Test sent — check your notifications.' : 'Test failed.')
    } catch {
      setNote('Test failed.')
    }
  }

  // Only render where Web Push is possible and the user is signed in.
  if (!platform.canWebPush || !user.id) return null

  return (
    <div
      style={{
        border: '1px solid rgba(255,107,53,0.16)',
        background: '#0F1430',
        padding: '20px',
        marginBottom: '24px',
        fontFamily: 'var(--font-mono)',
        maxWidth: '640px',
      }}
    >
      <div
        style={{
          color: '#E85D04',
          fontSize: 'var(--fs-caption)',
          letterSpacing: '0.25em',
          marginBottom: '14px',
        }}
      >
        {'// NOTIFICATIONS'}
      </div>

      {state === 'enabled' ? (
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-label)', color: MUTED, letterSpacing: '0.05em' }}>
            On — this device will receive alerts.
          </span>
          <button
            onClick={sendTest}
            className="btn-ghost"
            style={{ padding: '0.45rem 1.1rem', fontSize: 'var(--fs-caption)' }}
          >
            SEND TEST
          </button>
        </div>
      ) : state === 'denied' ? (
        <p style={{ margin: 0, fontSize: 'var(--fs-label)', color: MUTED, lineHeight: 1.6 }}>
          Notifications are blocked. Enable them for this site in your browser
          settings, then reload.
        </p>
      ) : (
        <button
          onClick={enable}
          disabled={state === 'busy'}
          className="btn-secondary"
          style={{ padding: '0.5rem 1.4rem', fontSize: 'var(--fs-caption)', opacity: state === 'busy' ? 0.5 : 1 }}
        >
          {state === 'busy' ? 'ENABLING...' : 'ENABLE NOTIFICATIONS'}
        </button>
      )}

      {note && (
        <p style={{ margin: '12px 0 0', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.45)', letterSpacing: '0.05em' }}>
          {note}
        </p>
      )}
    </div>
  )
}
