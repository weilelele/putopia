'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import styles from '@/app/profile/account-safety.module.css'
import { changeWebPushSubscription } from '@/lib/push/web-client'

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
      const wanted = !enabled
      await changeWebPushSubscription(wanted, { registration: () => navigator.serviceWorker.ready, notification: Notification, request: fetch })
      setEnabled(wanted)
      setMessage(wanted ? 'Console notifications are on. You can turn them off here anytime.' : 'Console notifications are off.')
      posthog.capture(wanted ? 'web_push_subscribed' : 'web_push_unsubscribed')
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
