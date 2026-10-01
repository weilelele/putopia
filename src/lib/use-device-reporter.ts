'use client'
import { useEffect, useState } from 'react'
import { getMyDeviceStatus } from '@/lib/actions/device-status'

/** null while loading, then whether the viewer has the "has device" status and may file reports. */
export function useDeviceReporter(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    getMyDeviceStatus()
      .then((status) => { if (live) setAllowed(status.has) })
      .catch(() => { if (live) setAllowed(false) })
    return () => { live = false }
  }, [])
  return allowed
}
