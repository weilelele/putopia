'use client'

import { useEffect } from 'react'
import { PWA_OFFLINE_VIEW_PENDING_KEY } from '@/types/pwa'

export function OfflineTracker() {
  useEffect(() => {
    try {
      localStorage.setItem(PWA_OFFLINE_VIEW_PENDING_KEY, new Date().toISOString())
    } catch {
      // Storage can be unavailable in private browsing; the offline page still works.
    }
  }, [])

  return null
}
