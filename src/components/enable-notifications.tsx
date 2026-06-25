'use client'

import { useEffect, useState } from 'react'
import { usePlatform } from '@/lib/platform'
import { useAuth } from '@/lib/auth-context'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// VAPID public keys are base64url; the Push API wants an ArrayBuffer-backed view.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

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
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled && sub) setState('enabled')
      }
    }
    sync().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    if (!VAPID_PUBLIC_KEY) {
      setState('error')
      setNote('Push is not configured.')
      return
    }
    setState('busy')
    setNote(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (!res.ok) throw new Error('save failed')
      setState('enabled')
    } catch {
      setState('error')
      setNote('Could not enable notifications.')
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
