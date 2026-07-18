'use client'

import { useEffect, useState } from 'react'
import { usePlatform } from '@/lib/platform'
import { useAuth } from '@/lib/auth-context'
import { subscribeToPush } from '@/lib/push/client'

// Auto "soft prompt" for notifications: a dismissible banner that appears after
// login (where Web Push is supported — see platform.canWebPush) so users don't
// have to hunt for the /profile toggle. Tapping "Enable" triggers the real
// system permission dialog; "Later" is remembered so we don't nag.
//
// Browsers forbid silently enabling push, and Chrome penalises sites that fire
// the system prompt without a gesture — hence this in-app buffer.

const DISMISS_KEY = 'mc-notif-prompt-dismissed-at'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000 // re-ask after 7 days
const REVEAL_DELAY_MS = 3500 // let the page settle before showing

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS
  } catch {
    return false
  }
}

export function NotificationPrompt() {
  const platform = usePlatform()
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!platform.canWebPush || !user.id) return
    // Only prompt when the user hasn't decided yet (granted/denied → leave alone).
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    if (dismissedRecently()) return

    const t = setTimeout(() => {
       
      setShow(true)
    }, REVEAL_DELAY_MS)
    return () => clearTimeout(t)
  }, [platform.canWebPush, user.id])

  async function enable() {
    setBusy(true)
    await subscribeToPush() // permission/denied/error all resolve the prompt
    setBusy(false)
    setShow(false)
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // private mode / storage blocked — fine, we just may re-ask next session
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      style={{
        position: 'fixed',
        left: '12px',
        right: '12px',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
        zIndex: 60,
        maxWidth: '420px',
        margin: '0 auto',
        background: '#0F1430',
        border: '1px solid rgba(255,107,53,0.35)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        padding: '16px 18px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        style={{
          color: '#E85D04',
          fontSize: 'var(--fs-caption)',
          letterSpacing: '0.25em',
          marginBottom: '8px',
        }}
      >
        {'// NOTIFICATIONS'}
      </div>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 'var(--fs-label)',
          color: 'rgba(245,245,245,0.75)',
          lineHeight: 1.55,
        }}
      >
        Get notified the moment your worlds update — even when the Console is
        closed.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={dismiss}
          className="btn-ghost"
          style={{ padding: '0.45rem 1rem', fontSize: 'var(--fs-caption)' }}
        >
          LATER
        </button>
        <button
          onClick={enable}
          disabled={busy}
          className="btn-secondary"
          style={{ padding: '0.45rem 1.2rem', fontSize: 'var(--fs-caption)', opacity: busy ? 0.5 : 1 }}
        >
          {busy ? 'ENABLING...' : 'ENABLE'}
        </button>
      </div>
    </div>
  )
}
