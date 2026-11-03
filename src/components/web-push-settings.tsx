'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import styles from '@/app/profile/account-safety.module.css'

function applicationKey(key: string): Uint8Array<ArrayBuffer> {
  const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, character => character.charCodeAt(0))
}

export function WebPushSettings() {
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let live = true
    if (!/Android/i.test(navigator.userAgent) || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    navigator.serviceWorker.ready.then(async registration => {
      const subscription = await registration.pushManager.getSubscription()
      const response = await fetch('/api/push/web/subscription', { cache: 'no-store' })
      const config = await response.json()
      let stored = false
      if (subscription && response.ok) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint))
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
        stored = config.endpointHashes?.includes(hash) === true
      }
      if (live) { setAvailable(true); setEnabled(stored && Notification.permission === 'granted') }
    }).catch(() => {})
    return () => { live = false }
  }, [])

  async function toggle() {
    setBusy(true); setMessage('')
    try {
      if (!enabled && Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') throw new Error('Notifications are off. You can enable them later in browser settings.')
      }
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (enabled && existing) {
        // Disable on the server first; preserve the subscription if that fails,
        // so users can retry and do not leave an enabled orphan on the server.
        const response = await fetch('/api/push/web/subscription', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: existing.endpoint }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        await existing.unsubscribe()
        setEnabled(false); setMessage('Console notifications are off.')
        posthog.capture('web_push_unsubscribed')
        return
      }
      const configResponse = await fetch('/api/push/web/subscription', { cache: 'no-store' })
      const config = await configResponse.json()
      if (!configResponse.ok || !config.publicKey) throw new Error('Notifications are not available yet. Please try again later.')
      if (Notification.permission === 'denied') throw new Error('Notifications are blocked. Allow them in your browser’s site settings to continue.')
      // subscribe is called only in response to this explicit user action.
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.publicKey) })
      const response = await fetch('/api/push/web/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), consent: true }) })
      const result = await response.json()
      if (!response.ok) {
        if (!existing) await subscription.unsubscribe()
        throw new Error(result.error || 'Could not enable notifications.')
      }
      setEnabled(true); setMessage('Console notifications are on. You can turn them off here anytime.')
      posthog.capture('web_push_subscribed')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update notifications.') }
    finally { setBusy(false) }
  }

  if (!available) return null
  return <ArchiveCard className={styles.card}>
    <ArchiveSectionLabel>CONSOLE NOTIFICATIONS</ArchiveSectionLabel>
    <p className={styles.note}>Receive occasional Collective news, Console updates and Voyager invitations on this phone. You can turn them off anytime.</p>
    <ArchiveButton loading={busy} variant={enabled ? 'secondary' : 'primary'} onClick={toggle}>{enabled ? 'TURN OFF NOTIFICATIONS' : 'ENABLE NOTIFICATIONS'}</ArchiveButton>
    {message && <p className={styles.note} role="status">{message}</p>}
  </ArchiveCard>
}
