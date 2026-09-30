import { useEffect } from 'react'
import { trackDevice } from '@/lib/device-analytics'

/**
 * Visible time spent on one batch room. Batch switches use history.pushState,
 * so PostHog's page-leave duration lumps every batch into one page; this event
 * is emitted per batch, when the viewer switches away, hides the tab, or leaves.
 */
export function useDeviceDwell(batchSlug: string) {
  useEffect(() => {
    let visibleMs = 0
    let since = document.visibilityState === 'visible' ? Date.now() : null
    const pause = () => {
      if (since !== null) visibleMs += Date.now() - since
      since = null
    }
    const flush = () => {
      pause()
      const seconds = Math.round(visibleMs / 1000)
      visibleMs = 0
      if (seconds >= 1) trackDevice('device_room_dwell', { batch_slug: batchSlug, seconds_visible: seconds })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
      else if (since === null) since = Date.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [batchSlug])
}
