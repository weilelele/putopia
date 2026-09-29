'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type PurchaseEvent = {
  eventId: string
  value: number
  currency: string
  contentId: string
}

const sentEvents = new Set<string>()

export function DevicePurchaseTracking({ event, pending }: { event: PurchaseEvent | null; pending: boolean }) {
  const router = useRouter()
  const eventId = event?.eventId
  const value = event?.value
  const currency = event?.currency
  const contentId = event?.contentId

  useEffect(() => {
    if (!pending) return
    // Stripe may redirect before its webhook finishes. Re-read the authorized
    // server order for at most a minute; a redirect itself never proves payment.
    let attempts = 0
    const timer = window.setInterval(() => {
      router.refresh()
      if (++attempts >= 20) window.clearInterval(timer)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [pending, router])

  useEffect(() => {
    if (!eventId || value == null || !currency || !contentId) return
    const storageKey = `meta:${eventId}`
    let attempts = 0
    const send = () => {
      if (sentEvents.has(eventId)) return true
      try {
        if (window.localStorage.getItem(storageKey)) return true
      } catch { /* Storage restrictions must not break the confirmation page. */ }
      const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq
      if (!fbq) return false
      fbq('track', 'Purchase', {
        value, currency, content_ids: [contentId], content_type: 'product', num_items: 1,
      }, { eventID: eventId })
      sentEvents.add(eventId)
      try { window.localStorage.setItem(storageKey, 'sent') } catch { /* In-memory dedup remains active. */ }
      return true
    }
    if (send()) return
    // The shared Pixel script loads after hydration. Stop if it is blocked.
    const timer = window.setInterval(() => {
      if (send() || ++attempts >= 60) window.clearInterval(timer)
    }, 500)
    return () => window.clearInterval(timer)
  }, [eventId, value, currency, contentId])

  return null
}
