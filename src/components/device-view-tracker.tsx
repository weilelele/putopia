'use client'

import { useEffect } from 'react'
import { trackDevice } from '@/lib/device-analytics'

/** Fires one Device page-view event when it mounts or its properties change. */
export function DeviceViewTracker({ event, properties = {} }: {
  event: string
  properties?: Record<string, string | number | boolean | null>
}) {
  const key = JSON.stringify(properties)
  useEffect(() => {
    trackDevice(event, JSON.parse(key))
  }, [event, key])
  return null
}
